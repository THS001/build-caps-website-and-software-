import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { localeNames, type Locale } from "@/i18n/locales"
import { CheckAll, RecheckItem, ResolveFlag } from "@/components/admin/qa-controls"

type Flag = { id: string; table_name: string; row_key: string; locale: Locale; field: string; severity: "high" | "medium" | "low"; issue: string; suggestion: string | null; created_at: string }

// Where each content type is edited, and what to call it.
const EDIT: Record<string, { href: (key: string) => string; select: string; key: string; label: (r: Record<string, unknown>) => string; kind: string }> = {
  properties: { href: (k) => `/admin/properties/${k}`, select: "id, title", key: "id", label: (r) => (r.title as { en: string }).en, kind: "Listing" },
  posts: { href: (k) => `/admin/posts/${k}`, select: "slug, title", key: "slug", label: (r) => (r.title as { en: string }).en, kind: "Article" },
  funnels: { href: (k) => `/admin/funnels/${k}`, select: "id, title", key: "id", label: (r) => (r.title as { en: string }).en, kind: "Opportunity" },
  communities: { href: (k) => `/admin/communities/${k}`, select: "slug, name", key: "slug", label: (r) => String(r.name), kind: "Community" },
  developers: { href: (k) => `/admin/developers/${k}`, select: "slug, name", key: "slug", label: (r) => String(r.name), kind: "Developer" },
  projects: { href: (k) => `/admin/projects/${k}`, select: "slug, name", key: "slug", label: (r) => String(r.name), kind: "Off-plan project" },
  reports: { href: (k) => `/admin/reports/${k}`, select: "slug, title", key: "slug", label: (r) => (r.title as { en: string }).en, kind: "Report" },
  jobs: { href: (k) => `/admin/jobs/${k}`, select: "slug, title", key: "slug", label: (r) => (r.title as { en: string }).en, kind: "Role" },
}

const TONE = { high: "bg-red-50 text-red-700 ring-red-200", medium: "bg-amber-50 text-amber-800 ring-amber-200", low: "bg-neutral-100 text-neutral-600 ring-neutral-200" } as const

export default async function TranslationQaPage() {
  const supabase = await serverClient()
  const [{ data: flags, error }, { count: checked }] = await Promise.all([
    supabase.from("translation_flags").select("id, table_name, row_key, locale, field, severity, issue, suggestion, created_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(500),
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("agent", "translation-qa").eq("status", "ok").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ])

  // Group by item and look up each item's name.
  const groups = new Map<string, Flag[]>()
  for (const f of (flags ?? []) as Flag[]) groups.set(`${f.table_name}:${f.row_key}`, [...(groups.get(`${f.table_name}:${f.row_key}`) ?? []), f])
  const names = new Map<string, string>()
  await Promise.all(
    Object.entries(EDIT).map(async ([table, spec]) => {
      const keys = [...groups.keys()].filter((k) => k.startsWith(`${table}:`)).map((k) => k.slice(table.length + 1))
      if (!keys.length) return
      const { data } = await supabase.from(table).select(spec.select).in(spec.key, keys)
      for (const r of (data ?? []) as unknown as Record<string, unknown>[]) names.set(`${table}:${r[spec.key]}`, spec.label(r))
    }),
  )
  const rank = (fs: Flag[]) => (fs.some((f) => f.severity === "high") ? 0 : fs.some((f) => f.severity === "medium") ? 1 : 2)
  const ordered = [...groups.entries()].sort((a, b) => rank(a[1]) - rank(b[1]))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Translation QA</h1>
        <CheckAll />
      </div>
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">
        Every time content is published, each language is compared with the English: meaning, numbers, dates, untranslated text, and brand, project and developer names that must stay as written. It only flags; fix the wording on the item, then mark the flag fixed or check the item again. {checked ? `${checked} checks in the last 30 days.` : ""}
      </p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}

      <div className="mt-8 space-y-4">
        {ordered.map(([key, list]) => {
          const [table, rowKey] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)]
          const spec = EDIT[table]
          return (
            <section key={key} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{spec?.kind ?? table}</p>
                  {spec ? (
                    <Link href={spec.href(rowKey)} className="font-semibold text-neutral-900 hover:underline">
                      {names.get(key) ?? rowKey}
                    </Link>
                  ) : (
                    <p className="font-semibold text-neutral-900">{rowKey}</p>
                  )}
                </div>
                <RecheckItem table={table} rowKey={rowKey} />
              </div>
              <ul className="mt-4 divide-y divide-neutral-100">
                {list.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${TONE[f.severity]}`}>{f.severity}</span>
                        <span className="text-xs text-neutral-500">
                          {localeNames[f.locale] ?? f.locale} · {f.field}
                        </span>
                      </p>
                      <p className="mt-1 text-neutral-800">{f.issue}</p>
                      {f.suggestion && (
                        <p className="mt-1 rounded-lg bg-sand-100 p-2 text-neutral-700" lang={f.locale} dir={["ar", "ur", "fa"].includes(f.locale) ? "rtl" : undefined}>
                          {f.suggestion}
                        </p>
                      )}
                    </div>
                    <ResolveFlag id={f.id} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        {!ordered.length && <p className="rounded-2xl bg-white p-10 text-center text-neutral-500 ring-1 ring-neutral-200">No open translation issues.</p>}
      </div>
    </div>
  )
}
