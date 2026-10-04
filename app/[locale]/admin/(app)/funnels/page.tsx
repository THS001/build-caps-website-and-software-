import Link from "next/link"
import { Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"
import { RowActions } from "@/components/admin/row-actions"

export default async function AdminFunnels() {
  const supabase = await serverClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: funnels, error }, { data: clicks }] = await Promise.all([
    supabase.from("funnels").select("id, slug, title, starts_at, ends_at, active, sort_order, external_url").order("sort_order"),
    supabase.from("funnel_clicks").select("funnel_id, clicked_at, source, locale").gte("clicked_at", since).limit(50_000),
  ])

  // Last-30-day clicks per funnel, with the top source page and language.
  const stats = new Map<string, { total: number; sources: Map<string, number>; locales: Map<string, number> }>()
  for (const c of clicks ?? []) {
    const s = stats.get(c.funnel_id) ?? { total: 0, sources: new Map(), locales: new Map() }
    s.total++
    s.sources.set(c.source ?? "—", (s.sources.get(c.source ?? "—") ?? 0) + 1)
    s.locales.set(c.locale ?? "—", (s.locales.get(c.locale ?? "—") ?? 0) + 1)
    stats.set(c.funnel_id, s)
  }
  const top = (m?: Map<string, number>) => (m ? [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} (${v})`).join(", ") : "—")

  const state = (f: { active: boolean; starts_at: string; ends_at: string | null }) =>
    !f.active ? "Inactive" : f.starts_at > today ? "Scheduled" : f.ends_at && f.ends_at < today ? "Expired" : "Live"

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Opportunities</h1>
        <Link href="/admin/funnels/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          New opportunity
        </Link>
      </div>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Opportunity</th>
              <th className="px-4 py-3 text-start font-medium">State</th>
              <th className="px-4 py-3 text-start font-medium">Clicks (30 days)</th>
              <th className="px-4 py-3 text-start font-medium">Top sources</th>
              <th className="px-4 py-3 text-start font-medium">Top languages</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(funnels ?? []).map((f) => {
              const s = stats.get(f.id)
              return (
                <tr key={f.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/funnels/${f.id}`} className="font-medium text-neutral-900 hover:underline">
                      {(f.title as { en: string }).en}
                    </Link>
                    <p className="text-xs text-neutral-500">/go/{f.slug}</p>
                  </td>
                  <td className="px-4 py-3">{state(f)}</td>
                  <td className="px-4 py-3 font-semibold">{s?.total ?? 0}</td>
                  <td className="px-4 py-3 text-neutral-600">{top(s?.sources)}</td>
                  <td className="px-4 py-3 text-neutral-600">{top(s?.locales)}</td>
                  <td className="px-4 py-3 text-end">
                    <RowActions kind="funnel" id={f.id} viewHref={f.external_url} />
                  </td>
                </tr>
              )
            })}
            {!funnels?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No opportunities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
