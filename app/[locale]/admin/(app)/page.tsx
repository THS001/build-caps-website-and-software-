import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { PURPOSES, STAGES, dubaiFormat, relative, stageLabel, stageTone } from "@/lib/crm"

const DAY = 86_400_000
const OFFSET = 4 * 3600_000

export default async function AdminDashboard() {
  const supabase = await serverClient()
  const now = new Date()
  const since = new Date(now.getTime() - 30 * DAY).toISOString()
  // Today in Dubai, as a date and as UTC instants.
  const dubaiToday = new Date(now.getTime() + OFFSET).toISOString().slice(0, 10)
  const dayStart = new Date(new Date(`${dubaiToday}T00:00:00Z`).getTime() - OFFSET)
  const dayEnd = new Date(dayStart.getTime() + DAY)

  const [published, drafts, funnels, clicks, newContacts, contacts, meetings, tasksDue, agents, recent, reviewsWaiting, qaFlags, noNotes] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("published", false),
    supabase.from("funnels").select("*", { count: "exact", head: true }).eq("active", true).lte("starts_at", dubaiToday).or(`ends_at.is.null,ends_at.gte.${dubaiToday}`),
    supabase.from("funnel_clicks").select("*", { count: "exact", head: true }).gte("clicked_at", since),
    supabase.from("contacts").select("*", { count: "exact", head: true }).gte("created_at", new Date(now.getTime() - 7 * DAY).toISOString()).neq("lifecycle", "subscriber"),
    supabase.from("contacts").select("stage").neq("lifecycle", "subscriber").limit(5000),
    supabase.from("appointments").select("id, starts_at, name, purpose, agent_slug, status, contact_id").eq("status", "confirmed").gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString()).order("starts_at"),
    supabase.from("contact_tasks").select("id, title, due_at, contact_id, contacts(name, email)").is("done_at", null).lt("due_at", dayEnd.toISOString()).order("due_at").limit(10),
    supabase.from("agents").select("slug, name"),
    supabase.from("contacts").select("id, name, email, stage, source, created_at").neq("lifecycle", "subscriber").order("created_at", { ascending: false }).limit(8),
    supabase.from("advisor_reviews").select("*", { count: "exact", head: true }).eq("published", false),
    supabase.from("translation_flags").select("*", { count: "exact", head: true }).is("resolved_at", null).in("severity", ["high", "medium"]),
    // Meetings in the last week that ended without notes (Advisor Copilot).
    supabase.from("appointments").select("*", { count: "exact", head: true }).in("status", ["confirmed", "completed"]).is("outcome", null).lt("ends_at", now.toISOString()).gte("starts_at", new Date(now.getTime() - 7 * DAY).toISOString()),
  ])
  const names = Object.fromEntries((agents.data ?? []).map((a) => [a.slug, a.name]))
  const byStage = Object.fromEntries(STAGES.map((s) => [s.key, (contacts.data ?? []).filter((c) => c.stage === s.key).length]))
  const maxStage = Math.max(1, ...Object.values(byStage))
  const tasks = (tasksDue.data ?? []) as unknown as { id: string; title: string; due_at: string; contact_id: string; contacts: { name: string | null; email: string } | null }[]

  const tiles = [
    { label: "New contacts (7 days)", value: newContacts.count ?? 0, href: "/admin/crm?view=list" },
    { label: "Meetings today", value: meetings.data?.length ?? 0, href: "/admin/calendar" },
    { label: "Tasks due", value: tasks.length, href: "/admin/crm/tasks" },
    { label: "Published listings", value: published.count ?? 0, href: "/admin/properties" },
    { label: "Draft listings", value: drafts.count ?? 0, href: "/admin/properties" },
    { label: "Opportunity clicks (30 days)", value: clicks.count ?? 0, href: "/admin/funnels", hint: `${funnels.count ?? 0} live` },
  ]

  const attention = [
    { count: noNotes.count ?? 0, text: (n: number) => `${n} meeting${n === 1 ? "" : "s"} this week without notes: add them with Copilot`, href: "/admin/calendar" },
    { count: reviewsWaiting.count ?? 0, text: (n: number) => `${n} client review${n === 1 ? "" : "s"} waiting for approval`, href: "/admin/team" },
    { count: qaFlags.count ?? 0, text: (n: number) => `${n} translation issue${n === 1 ? "" : "s"} to check`, href: "/admin/translations" },
  ].filter((a) => a.count > 0)

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">Dashboard</h1>
      {attention.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {attention.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="inline-block rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200 hover:ring-amber-400">
                {a.text(a.count)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200 hover:ring-rose-300">
            <p className="text-3xl font-bold text-neutral-900">{tile.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{tile.label}</p>
            {tile.hint && <p className="text-xs text-neutral-400">{tile.hint}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <h2 className="font-semibold text-neutral-900">Today&apos;s meetings</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(meetings.data ?? []).map((m) => (
              <li key={m.id}>
                <Link href={`/admin/calendar?open=${m.id}`} className="font-medium text-neutral-900 hover:text-rose-700">
                  {dubaiFormat(m.starts_at, { hour: "2-digit", minute: "2-digit" })} · {m.name}
                </Link>
                <p className="text-xs text-neutral-500">
                  {PURPOSES.find((p) => p.key === m.purpose)?.label ?? m.purpose} · {names[m.agent_slug] ?? m.agent_slug}
                </p>
              </li>
            ))}
            {!meetings.data?.length && <li className="text-neutral-500">No meetings today.</li>}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <h2 className="font-semibold text-neutral-900">Due today or overdue</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/crm/${t.contact_id}`} className="font-medium text-neutral-900 hover:text-rose-700">
                  {t.title}
                </Link>
                <p className={`text-xs ${new Date(t.due_at) < now ? "font-semibold text-red-600" : "text-neutral-500"}`}>
                  {t.contacts?.name ?? t.contacts?.email} · {relative(t.due_at)}
                </p>
              </li>
            ))}
            {!tasks.length && <li className="text-neutral-500">Nothing due.</li>}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <h2 className="font-semibold text-neutral-900">Pipeline</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {STAGES.map((s) => (
              <li key={s.key}>
                <Link href={`/admin/crm?view=list&stage=${s.key}`} className="grid grid-cols-[96px_1fr_32px] items-center gap-2 hover:text-rose-700">
                  <span className="text-neutral-700">{s.label}</span>
                  <span className="h-2 rounded-full bg-neutral-100">
                    <span className="block h-2 rounded-full bg-rose-400" style={{ width: `${(byStage[s.key] / maxStage) * 100}%` }} />
                  </span>
                  <span className="text-end font-medium text-neutral-900">{byStage[s.key]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <h2 className="mt-12 mb-4 text-lg font-semibold text-neutral-900">Latest contacts</h2>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
        <table className="w-full text-sm">
          <tbody>
            {(recent.data ?? []).map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-500">{dubaiFormat(c.created_at, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/crm/${c.id}`} className="font-medium text-neutral-900 hover:text-rose-700">
                    {c.name ?? c.email}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${stageTone(c.stage)}`}>{stageLabel(c.stage)}</span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{c.source}</td>
              </tr>
            ))}
            {!recent.data?.length && (
              <tr>
                <td className="px-4 py-6 text-neutral-500">No contacts yet. Website enquiries and bookings appear here automatically.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
