import { serverClient } from "@/lib/supabase/server"
import { aiConfigured } from "@/lib/ai/client"
import { gscConfigured } from "@/lib/seo-agent/gsc"
import { seoMode } from "@/lib/seo-agent/run"
import { ProposalButtons, RunSeoButtons } from "@/components/admin/seo-actions"

type Row = {
  id: string
  created_at: string
  locale: string
  pathname: string
  kind: string
  risk: string
  status: string
  current: { title?: string | null; description?: string | null } | null
  proposed: Record<string, unknown>
  rationale: string | null
  evidence: { note?: string; keywords?: string[] } | null
  result: Record<string, unknown> | null
}

const tone: Record<string, string> = {
  proposed: "bg-amber-50 text-amber-800",
  applied: "bg-emerald-50 text-emerald-700",
  kept: "bg-emerald-50 text-emerald-700",
  rejected: "bg-neutral-100 text-neutral-600",
  rolled_back: "bg-red-50 text-red-700",
}

function Proposed({ row }: { row: Row }) {
  const p = row.proposed as {
    title?: string
    description?: string
    links?: { href: string; label: string }[]
    faq?: { q: string; a: string }[]
    slug?: string
    excerpt?: string
    body?: string[]
  }
  if (row.kind === "meta")
    return (
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Now</dt>
          <dd className="mt-1 font-medium text-neutral-900">{row.current?.title ?? "—"}</dd>
          <dd className="mt-1 text-neutral-600">{row.current?.description ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-rose-700">Proposed</dt>
          <dd className="mt-1 font-medium text-neutral-900">{p.title}</dd>
          <dd className="mt-1 text-neutral-600">{p.description}</dd>
        </div>
      </dl>
    )
  if (row.kind === "internal_links")
    return (
      <ul className="flex flex-wrap gap-2 text-sm">
        {p.links?.map((l) => (
          <li key={l.href} className="rounded-full px-3 py-1 ring-1 ring-neutral-200">
            {l.label} <span className="text-neutral-400">{l.href}</span>
          </li>
        ))}
      </ul>
    )
  if (row.kind === "faq")
    return (
      <dl className="space-y-3 text-sm">
        {p.faq?.map((f) => (
          <div key={f.q}>
            <dt className="font-medium text-neutral-900">{f.q}</dt>
            <dd className="text-neutral-600">{f.a}</dd>
          </div>
        ))}
      </dl>
    )
  if (row.kind === "new_page")
    return (
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-neutral-900">
          {p.title} <span className="text-neutral-400">/insights/{p.slug}</span>
        </summary>
        <p className="mt-2 italic text-neutral-600">{p.excerpt}</p>
        {p.body?.map((para, i) => (
          <p key={i} className="mt-2 text-neutral-700">
            {para}
          </p>
        ))}
        <p className="mt-3 text-xs text-neutral-500">Approving creates an unpublished draft in Insights for an editor to finish and translate.</p>
      </details>
    )
  return <pre className="overflow-x-auto text-xs">{JSON.stringify(p, null, 2)}</pre>
}

export default async function AdminSeo({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "proposed" } = await searchParams
  const supabase = await serverClient()
  const [{ data: runs }, { data: rows, error }, { data: metrics }] = await Promise.all([
    supabase.from("seo_runs").select("id, created_at, mode, status, summary").order("created_at", { ascending: false }).limit(5),
    supabase.from("seo_proposals").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100),
    supabase.from("seo_metrics").select("page, period_end, clicks, impressions, ctr, position").order("period_end", { ascending: false }).order("impressions", { ascending: false }).limit(15),
  ])
  const filters = ["proposed", "applied", "kept", "rolled_back", "rejected"]

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">SEO Growth Agent</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        Weekly: reads Search Console, audits our pages, researches who ranks (Claude web search and a robots.txt-respecting crawl), then proposes titles, descriptions, internal links, FAQs and article drafts. In live mode, low-risk changes publish with a snapshot and are measured for 14 to 28 days; losers roll back automatically. Content always waits for approval here.
      </p>
      <dl className="mt-6 flex flex-wrap gap-3 text-sm">
        {[
          ["Mode", seoMode === "live" ? "Live" : "Dry run"],
          ["Search Console", gscConfigured ? "Connected" : "Not connected"],
          ["Claude", aiConfigured ? "Connected" : "Not connected"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-full bg-white px-4 py-2 ring-1 ring-neutral-200">
            <dt className="inline text-neutral-500">{k}: </dt>
            <dd className="inline font-medium text-neutral-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <RunSeoButtons live={seoMode === "live"} />
      </div>

      {runs && runs.length > 0 && (
        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <h2 className="font-semibold text-neutral-900">Recent runs</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {runs.map((r) => (
              <li key={r.id} className={r.status === "error" ? "text-red-600" : "text-neutral-700"}>
                {new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} · {r.mode === "live" ? "live" : "dry run"} · {r.summary ?? r.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-8 flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <a key={f} href={`/admin/seo?status=${f}`} className={`rounded-full px-3 py-1.5 ring-1 ${status === f ? "bg-neutral-900 text-white ring-neutral-900" : "text-neutral-700 ring-neutral-200"}`}>
            {f.replace("_", " ")}
          </a>
        ))}
      </nav>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-6 space-y-4">
        {((rows ?? []) as Row[]).map((row) => (
          <article key={row.id} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-900">
                  {row.kind.replace("_", " ")} · <span className="font-mono text-sm">/{row.locale}{row.pathname}</span>
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(row.created_at).toLocaleDateString("en-GB")} · {row.risk === "low" ? "low risk" : "content: needs approval"}
                  {row.evidence?.keywords?.length ? ` · ${row.evidence.keywords.join(", ")}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${tone[row.status] ?? ""}`}>{row.status.replace("_", " ")}</span>
            </div>
            <div className="mt-4">
              <Proposed row={row} />
            </div>
            {row.rationale && <p className="mt-4 text-sm text-neutral-700">{row.rationale}</p>}
            {row.evidence?.note && <p className="mt-1 text-xs text-neutral-500">Evidence: {row.evidence.note}</p>}
            {row.result && <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">{JSON.stringify(row.result, null, 2)}</pre>}
            <div className="mt-4">
              <ProposalButtons id={row.id} status={row.status} />
            </div>
          </article>
        ))}
        {!rows?.length && <p className="rounded-2xl bg-white p-10 text-center text-neutral-500 ring-1 ring-neutral-200">Nothing here.</p>}
      </div>

      {metrics && metrics.length > 0 && (
        <section className="mt-10 overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="px-5 pt-5 text-start font-semibold text-neutral-900">Top pages (last 28 days)</caption>
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 text-start font-medium">Page</th>
                <th className="px-5 py-3 text-end font-medium">Clicks</th>
                <th className="px-5 py-3 text-end font-medium">Impressions</th>
                <th className="px-5 py-3 text-end font-medium">CTR</th>
                <th className="px-5 py-3 text-end font-medium">Position</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={`${m.page}${m.period_end}`} className="border-t border-neutral-100">
                  <td className="px-5 py-2 font-mono text-xs">{m.page}</td>
                  <td className="px-5 py-2 text-end">{m.clicks}</td>
                  <td className="px-5 py-2 text-end">{m.impressions}</td>
                  <td className="px-5 py-2 text-end">{(Number(m.ctr) * 100).toFixed(1)}%</td>
                  <td className="px-5 py-2 text-end">{Number(m.position).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
