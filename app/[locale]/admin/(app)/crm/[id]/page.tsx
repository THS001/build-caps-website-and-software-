import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarPlus, Mail, MessageCircle, Phone } from "lucide-react"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import { ACTIVITY_LABELS, PURPOSES, dubaiDate, dubaiFormat, relative, stageLabel, stageTone } from "@/lib/crm"
import { ActivityComposer, ContactSummary, DeleteActivity, DeleteContactButton, TaskPanel, type ContactView, type TaskView } from "@/components/admin/contact-panels"
import { AppointmentActions } from "@/components/admin/appointment-actions"
import { FollowupDraft } from "@/components/admin/followup-draft"

type Activity = { id: string; created_at: string; kind: string; body: string | null; meta: Record<string, unknown>; author: string | null }

const purposeLabel = (p: string) => PURPOSES.find((x) => x.key === p)?.label ?? p

function describe(a: Activity, agents: Record<string, string>) {
  const m = a.meta ?? {}
  switch (a.kind) {
    case "lead":
      return `Website ${String(m.kind ?? "enquiry")}${m.interest ? ` (${m.interest})` : ""}${m.source ? ` from ${m.source}` : ""}`
    case "booking":
      return `${purposeLabel(String(m.purpose ?? ""))} booked for ${m.starts_at ? dubaiFormat(String(m.starts_at), { dateStyle: "medium", timeStyle: "short" }) : "?"} with ${agents[String(m.agent)] ?? m.agent} · ${m.reference ?? ""}`
    case "meeting":
      return a.body === "rescheduled" ? `Meeting ${m.reference ?? ""} moved to ${m.to ? dubaiFormat(String(m.to), { dateStyle: "medium", timeStyle: "short" }) : "?"}` : `Meeting ${m.reference ?? ""}: ${String(a.body).replace("_", "-")}`
    case "stage":
      return `Stage: ${stageLabel(String(m.from ?? ""))} → ${stageLabel(String(m.to ?? a.body ?? ""))}`
    default:
      return null
  }
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await serverClient()
  const { data: contact } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle()
  if (!contact) notFound()

  const [staff, { data: activities }, { data: tasks }, { data: appointments }, { data: leads }, { data: agents }, { data: people }] = await Promise.all([
    currentStaff(),
    supabase.from("contact_activities").select("id, created_at, kind, body, meta, author").eq("contact_id", id).order("created_at", { ascending: false }).limit(300),
    supabase.from("contact_tasks").select("id, title, due_at, done_at, assignee").eq("contact_id", id).order("done_at", { ascending: true, nullsFirst: true }).order("due_at"),
    supabase.from("appointments").select("id, reference, purpose, mode, agent_slug, starts_at, status, meeting_url, notes, outcome").eq("contact_id", id).order("starts_at", { ascending: false }),
    supabase.from("leads").select("id, created_at, kind, interest, message, source, utm").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("agents").select("slug, name, user_id").order("sort_order"),
    supabase.from("profiles").select("id, full_name"),
  ])
  const leadIds = (leads ?? []).map((l) => l.id)
  const { data: drafts } = leadIds.length ? await supabase.from("lead_followups").select("id, score, reasoning, subject, body").eq("status", "draft").in("lead_id", leadIds) : { data: [] }

  const agentNames = Object.fromEntries((agents ?? []).map((a) => [a.slug, a.name]))
  const authorNames = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name ?? "Staff"]))
  const myAgent = (agents ?? []).find((a) => a.user_id === staff?.id)?.slug ?? null
  const c = contact as ContactView & { created_at: string; last_activity_at: string; utm: Record<string, string> }
  const wa = c.phone ? `https://wa.me/${c.phone.replace(/\D/g, "")}` : null

  return (
    <div>
      <Link href="/admin/crm" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← CRM
      </Link>
      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">{c.name ?? c.email}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            <span className={`me-2 rounded-full px-2 py-0.5 text-xs ring-1 ${stageTone(c.stage)}`}>{stageLabel(c.stage)}</span>
            {c.lifecycle === "subscriber" && <span className="me-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">Newsletter only</span>}
            {c.lifecycle === "client" && <span className="me-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">Client</span>}
            In CRM since {dubaiFormat(c.created_at, { dateStyle: "medium" })} · last activity {relative(c.last_activity_at)}
            {c.source && ` · source: ${c.source}`}
            {c.locale && ` · speaks ${c.locale.toUpperCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
            <Mail className="h-4 w-4" /> Email
          </a>
          <Link href={`/admin/calendar/new?contact=${c.id}`} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white">
            <CalendarPlus className="h-4 w-4" /> Book a meeting
          </Link>
        </div>
      </header>
      <p className="mt-2 text-sm text-neutral-700">
        {c.email}
        {c.phone && ` · ${c.phone}`}
        {c.country && ` · ${c.country}`}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {(drafts ?? []).map((d) => (
            <FollowupDraft key={d.id} id={d.id} score={d.score} reasoning={d.reasoning} subject={d.subject} body={d.body} />
          ))}
          <ActivityComposer contactId={c.id} />
          <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
            <h2 className="font-semibold text-neutral-900">Timeline</h2>
            <ol className="mt-4 space-y-4">
              {(activities as Activity[] | null)?.map((a) => {
                const auto = describe(a, agentNames)
                return (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-rose-700">{ACTIVITY_LABELS[a.kind] ?? a.kind}</span>
                    <div className="min-w-0 flex-1">
                      {auto && <p className="text-neutral-800">{auto}</p>}
                      {a.body && (a.kind !== "stage" && a.kind !== "meeting") && <p className="whitespace-pre-line text-neutral-700">{a.body}</p>}
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {dubaiFormat(a.created_at, { dateStyle: "medium", timeStyle: "short" })}
                        {a.author && ` · ${authorNames[a.author] ?? "Staff"}`}
                      </p>
                    </div>
                    {["note", "call", "email", "whatsapp"].includes(a.kind) && (a.author === staff?.id || staff?.role === "admin") && <DeleteActivity id={a.id} />}
                  </li>
                )
              })}
              {!activities?.length && <li className="text-sm text-neutral-500">Nothing yet.</li>}
            </ol>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <ContactSummary contact={c} agents={(agents ?? []).map((a) => ({ slug: a.slug, name: a.name }))} />
          <TaskPanel contactId={c.id} tasks={(tasks ?? []) as TaskView[]} agents={(agents ?? []).map((a) => ({ slug: a.slug, name: a.name }))} defaultAssignee={c.owner ?? myAgent} />

          <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
            <h2 className="font-semibold text-neutral-900">Meetings</h2>
            <ul className="mt-3 space-y-4">
              {(appointments ?? []).map((a) => (
                <li key={a.id} className="text-sm">
                  <Link href={`/admin/calendar?week=${dubaiDate(a.starts_at)}&open=${a.id}`} className="font-medium text-neutral-900 hover:text-rose-700">
                    {dubaiFormat(a.starts_at, { weekday: "short", dateStyle: undefined, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {purposeLabel(a.purpose)}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {agentNames[a.agent_slug] ?? a.agent_slug} · {a.mode} · {a.reference}
                  </p>
                  {a.outcome && <p className="mt-1 line-clamp-3 text-xs text-neutral-600">{(a.outcome as { summary: string }).summary}</p>}
                  {!a.outcome && a.status !== "cancelled" && new Date(a.starts_at).getTime() < Date.now() && (
                    <Link href={`/admin/calendar?week=${dubaiDate(a.starts_at)}&open=${a.id}`} className="mt-1 inline-block text-xs font-semibold text-rose-700 hover:underline">
                      Add meeting notes with Copilot
                    </Link>
                  )}
                  <div className="mt-2">
                    <AppointmentActions id={a.id} status={a.status} agent={a.agent_slug} agents={(agents ?? []).map((g) => ({ value: g.slug, label: g.name }))} />
                  </div>
                </li>
              ))}
              {!appointments?.length && <li className="text-sm text-neutral-500">No meetings yet.</li>}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
            <h2 className="font-semibold text-neutral-900">Website enquiries</h2>
            <ul className="mt-3 space-y-3">
              {(leads ?? []).map((l) => (
                <li key={l.id} className="text-sm">
                  <p className="text-xs text-neutral-500">
                    {dubaiFormat(l.created_at, { dateStyle: "medium", timeStyle: "short" })} · {l.kind}
                    {l.interest && ` · ${l.interest}`} · {l.source}
                  </p>
                  {l.message && <p className="mt-1 whitespace-pre-line text-neutral-700">{l.message}</p>}
                </li>
              ))}
              {!leads?.length && <li className="text-sm text-neutral-500">None.</li>}
            </ul>
            {Object.keys(c.utm ?? {}).length > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                First visit: {Object.entries(c.utm).map(([k, v]) => `${k}=${v}`).join(" · ")}
              </p>
            )}
          </section>

          {staff?.role === "admin" && (
            <div className="text-end">
              <DeleteContactButton id={c.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
