import Link from "next/link"
import { Download, ListTodo, Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"
import { PipelineBoard, type BoardContact } from "@/components/admin/pipeline-board"
import { STAGES, relative, stageLabel, stageTone } from "@/lib/crm"

type Search = { view?: string; q?: string; stage?: string; owner?: string; source?: string; who?: string }

export default async function AdminCrm({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const view = sp.view === "list" ? "list" : "board"
  const supabase = await serverClient()

  let query = supabase
    .from("contacts")
    .select("id, name, email, phone, stage, owner, score, value_aed, budget_aed, last_activity_at, next_follow_up_at, source, lifecycle, created_at, tags")
    .order("last_activity_at", { ascending: false })
    .limit(view === "board" ? 600 : 300)
  // Newsletter-only subscribers stay out of the pipeline unless asked for.
  query = sp.who === "subscribers" ? query.eq("lifecycle", "subscriber") : sp.who === "all" ? query : query.neq("lifecycle", "subscriber")
  if (sp.stage) query = query.eq("stage", sp.stage)
  if (sp.owner) query = sp.owner === "none" ? query.is("owner", null) : query.eq("owner", sp.owner)
  if (sp.source) query = query.eq("source", sp.source)
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, " ").trim()
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [{ data, error }, { data: agents }, newThisWeek, overdue, meetings] = await Promise.all([
    query,
    supabase.from("agents").select("slug, name").order("sort_order"),
    supabase.from("contacts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo).neq("lifecycle", "subscriber"),
    supabase.from("contact_tasks").select("*", { count: "exact", head: true }).is("done_at", null).lt("due_at", new Date().toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "confirmed").gte("starts_at", new Date().toISOString()).lt("starts_at", new Date(Date.now() + 7 * 86_400_000).toISOString()),
  ])
  const contacts = (data ?? []) as (BoardContact & { lifecycle: string; created_at: string; tags: string[] })[]
  const owners = Object.fromEntries((agents ?? []).map((a) => [a.slug, a.name]))
  const open = contacts.filter((c) => c.stage !== "won" && c.stage !== "lost")
  const pipelineValue = open.reduce((s, c) => s + (c.value_aed ?? c.budget_aed ?? 0), 0)
  const sources = [...new Set(contacts.map((c) => c.source).filter(Boolean))] as string[]

  const params = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])
    return `/admin/crm?${next}`
  }
  const tiles = [
    { label: "New this week", value: newThisWeek.count ?? 0 },
    { label: "Open deals", value: open.length },
    { label: "Pipeline value", value: `AED ${new Intl.NumberFormat("en-AE", { notation: "compact", maximumFractionDigits: 1 }).format(pipelineValue)}` },
    { label: "Meetings next 7 days", value: meetings.count ?? 0, href: "/admin/calendar" },
    { label: "Overdue tasks", value: overdue.count ?? 0, href: "/admin/crm/tasks", alert: (overdue.count ?? 0) > 0 },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">CRM</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/crm/tasks" className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
            <ListTodo className="h-4 w-4" /> Tasks
          </Link>
          <a href={`/admin/crm/export?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <Link href="/admin/crm/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white">
            <Plus className="h-4 w-4" /> Add contact
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => {
          const body = (
            <>
              <p className={`text-2xl font-bold ${t.alert ? "text-red-600" : "text-neutral-900"}`}>{t.value}</p>
              <p className="mt-1 text-sm text-neutral-500">{t.label}</p>
            </>
          )
          return t.href ? (
            <Link key={t.label} href={t.href} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200 hover:ring-rose-300">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
              {body}
            </div>
          )
        })}
      </div>

      <form action="/admin/crm" className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={sp.q} placeholder="Search name, email or phone" className="admin-input h-10 w-64" />
        <select name="owner" defaultValue={sp.owner ?? ""} className="admin-input h-10 w-auto">
          <option value="">All owners</option>
          <option value="none">Unassigned</option>
          {(agents ?? []).map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className="admin-input h-10 w-auto">
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {view === "list" && (
          <select name="stage" defaultValue={sp.stage ?? ""} className="admin-input h-10 w-auto">
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <select name="who" defaultValue={sp.who ?? ""} className="admin-input h-10 w-auto">
          <option value="">Leads and clients</option>
          <option value="subscribers">Newsletter subscribers</option>
          <option value="all">Everyone</option>
        </select>
        <button className="rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white">Filter</button>
        <span className="ms-auto flex gap-1 rounded-full bg-white p-1 ring-1 ring-neutral-200">
          <Link href={params({ view: "board" })} className={`rounded-full px-3 py-1 ${view === "board" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}>
            Pipeline
          </Link>
          <Link href={params({ view: "list" })} className={`rounded-full px-3 py-1 ${view === "list" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}>
            List
          </Link>
        </span>
      </form>

      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}

      <div className="mt-6">
        {view === "board" ? (
          <PipelineBoard contacts={contacts} owners={owners} />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Contact</th>
                  <th className="px-4 py-3 text-start font-medium">Stage</th>
                  <th className="px-4 py-3 text-start font-medium">Owner</th>
                  <th className="px-4 py-3 text-start font-medium">Score</th>
                  <th className="px-4 py-3 text-start font-medium">Source</th>
                  <th className="px-4 py-3 text-start font-medium">Last activity</th>
                  <th className="px-4 py-3 text-start font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/crm/${c.id}`} className="font-medium text-neutral-900 hover:text-rose-700">
                        {c.name ?? c.email}
                      </Link>
                      <span className="block text-xs text-neutral-500">
                        {c.email}
                        {c.phone && ` · ${c.phone}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${stageTone(c.stage)}`}>{stageLabel(c.stage)}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{c.owner ? (owners[c.owner] ?? c.owner) : "—"}</td>
                    <td className="px-4 py-3 text-neutral-700">{c.score ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{c.source ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{relative(c.last_activity_at)}</td>
                    <td className={`px-4 py-3 ${c.next_follow_up_at && new Date(c.next_follow_up_at) < new Date() ? "font-semibold text-red-600" : "text-neutral-500"}`}>{c.next_follow_up_at ? relative(c.next_follow_up_at) : "—"}</td>
                  </tr>
                ))}
                {!contacts.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      No contacts match. Website enquiries and bookings appear here automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
