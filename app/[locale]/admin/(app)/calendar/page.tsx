import Link from "next/link"
import { ChevronLeft, ChevronRight, List, Plus, X } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"
import { AppointmentActions } from "@/components/admin/appointment-actions"
import { RescheduleForm } from "@/components/admin/booking-controls"
import { MeetingCopilot } from "@/components/admin/meeting-copilot"
import type { MeetingOutcome } from "@/lib/ai/agents/copilot"
import { MODES, PURPOSES, advisorColor, dubaiFormat } from "@/lib/crm"
import { cn } from "@/lib/utils"

type Search = { week?: string; agent?: string; open?: string; booked?: string; cancelled?: string }
type Appt = { id: string; reference: string; purpose: string; mode: string; agent_slug: string; starts_at: string; ends_at: string; name: string; email: string; phone: string; language: string; status: string; notes: string | null; meeting_url: string | null; property_slug: string | null; contact_id: string | null }

const DAY = 86_400_000
const OFFSET = 4 * 3600_000 // Dubai is UTC+4 all year
const HOUR_PX = 56
const label = (list: readonly { key: string; label: string }[], k: string) => list.find((x) => x.key === k)?.label ?? k

/** Monday 00:00 (Dubai) of the week containing `date`, as a Dubai date string. */
function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  const back = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - back * DAY).toISOString().slice(0, 10)
}
const dubaiDay = (iso: string) => new Date(new Date(iso).getTime() + OFFSET).toISOString().slice(0, 10)
const dubaiMinutes = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + OFFSET)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** Side-by-side lanes for overlapping bookings in one day column. */
function lanes(items: Appt[]) {
  const sorted = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const ends: number[] = []
  const placed = sorted.map((a) => {
    const start = new Date(a.starts_at).getTime()
    let lane = ends.findIndex((e) => e <= start)
    if (lane === -1) lane = ends.push(0) - 1
    ends[lane] = new Date(a.ends_at).getTime()
    return { a, lane }
  })
  return { placed, count: Math.max(1, ends.length) }
}

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  // Only plain slugs reach the database filters.
  if (sp.agent && !/^[a-z0-9-]+$/.test(sp.agent)) sp.agent = undefined
  if (sp.open && !/^[0-9a-f-]{36}$/.test(sp.open)) sp.open = undefined
  const today = dubaiDay(new Date().toISOString())
  const monday = mondayOf(sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today)
  const from = new Date(new Date(`${monday}T00:00:00Z`).getTime() - OFFSET)
  const to = new Date(from.getTime() + 7 * DAY)
  const days = Array.from({ length: 7 }, (_, i) => new Date(new Date(`${monday}T00:00:00Z`).getTime() + i * DAY).toISOString().slice(0, 10))

  const supabase = await serverClient()
  let apptQuery = supabase
    .from("appointments")
    .select("id, reference, purpose, mode, agent_slug, starts_at, ends_at, name, email, phone, language, status, notes, meeting_url, property_slug, contact_id")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at")
  if (sp.cancelled !== "1") apptQuery = apptQuery.neq("status", "cancelled")
  if (sp.agent) apptQuery = apptQuery.eq("agent_slug", sp.agent)
  let offQuery = supabase.from("agent_time_off").select("id, agent_slug, starts_at, ends_at, reason").lt("starts_at", to.toISOString()).gt("ends_at", from.toISOString())
  if (sp.agent) offQuery = offQuery.or(`agent_slug.eq.${sp.agent},agent_slug.is.null`)
  const [{ data: appts, error }, { data: off }, { data: agents }, opened] = await Promise.all([
    apptQuery,
    offQuery,
    supabase.from("agents").select("slug, name").eq("active", true).neq("role", "ceo").order("sort_order"),
    sp.open ? supabase.from("appointments").select("*").eq("id", sp.open).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const list = (appts ?? []) as Appt[]
  const allSlugs = (agents ?? []).map((a) => a.slug)
  const names = Object.fromEntries((agents ?? []).map((a) => [a.slug, a.name]))
  const minutes = list.flatMap((a) => [dubaiMinutes(a.starts_at), dubaiMinutes(a.ends_at)])
  const firstHour = Math.min(8, ...minutes.map((m) => Math.floor(m / 60)))
  const lastHour = Math.max(21, ...minutes.map((m) => Math.ceil(m / 60)))
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i)
  const nowMin = dubaiMinutes(new Date().toISOString())

  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ week: monday, agent: sp.agent, cancelled: sp.cancelled, ...patch }).filter(([, v]) => v) as [string, string][])
    return `/admin/calendar?${next}`
  }
  const open = opened.data as (Appt & { created_at: string; budget: string | null; timeline: string | null; brief: string | null; outcome: MeetingOutcome | null }) | null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Calendar</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/appointments" className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
            <List className="h-4 w-4" /> List view
          </Link>
          <Link href="/admin/availability" className="rounded-full px-4 py-2 ring-1 ring-neutral-200 hover:bg-white">
            Hours and time off
          </Link>
          <Link href={`/admin/calendar/new${sp.agent ? `?agent=${sp.agent}` : ""}`} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white">
            <Plus className="h-4 w-4" /> New booking
          </Link>
        </div>
      </div>

      {sp.booked && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Booked: reference {sp.booked}.</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <Link href={href({ week: new Date(new Date(`${monday}T00:00:00Z`).getTime() - 7 * DAY).toISOString().slice(0, 10), open: undefined })} aria-label="Previous week" className="rounded-full p-2 ring-1 ring-neutral-200 hover:bg-white">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link href={href({ week: today, open: undefined })} className="rounded-full px-3 py-1.5 ring-1 ring-neutral-200 hover:bg-white">
          Today
        </Link>
        <Link href={href({ week: new Date(new Date(`${monday}T00:00:00Z`).getTime() + 7 * DAY).toISOString().slice(0, 10), open: undefined })} aria-label="Next week" className="rounded-full p-2 ring-1 ring-neutral-200 hover:bg-white">
          <ChevronRight className="h-4 w-4" />
        </Link>
        <span className="font-semibold text-neutral-900">
          {dubaiFormat(`${days[0]}T08:00:00Z`, { day: "numeric", month: "short" })} – {dubaiFormat(`${days[6]}T08:00:00Z`, { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <form action="/admin/calendar" className="ms-auto flex items-center gap-2">
          <input type="hidden" name="week" value={monday} />
          <select name="agent" defaultValue={sp.agent ?? ""} className="admin-input h-9 w-auto">
            <option value="">All advisors</option>
            {(agents ?? []).map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-neutral-600">
            <input type="checkbox" name="cancelled" value="1" defaultChecked={sp.cancelled === "1"} /> Show cancelled
          </label>
          <button className="rounded-full bg-neutral-900 px-3 py-1.5 text-white">Show</button>
        </form>
      </div>

      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-600">
        {(agents ?? []).map((a) => (
          <li key={a.slug} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: advisorColor(a.slug, allSlugs) }} />
            {a.name}
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      <div className={cn("mt-4 grid gap-6", open && "xl:grid-cols-[1fr_360px]")}>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
          <div className="grid min-w-[900px] grid-cols-[56px_repeat(7,1fr)]">
            <div className="border-b border-neutral-200" />
            {days.map((d) => (
              <div key={d} className={cn("border-b border-s border-neutral-200 px-2 py-2 text-center text-xs", d === today && "bg-rose-50")}>
                <span className="block font-semibold text-neutral-900">{dubaiFormat(`${d}T08:00:00Z`, { weekday: "short" })}</span>
                <span className="text-neutral-500">{dubaiFormat(`${d}T08:00:00Z`, { day: "numeric", month: "short" })}</span>
              </div>
            ))}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="border-b border-neutral-100 pe-2 pt-1 text-end text-[11px] text-neutral-400">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const dayAppts = list.filter((a) => dubaiDay(a.starts_at) === d)
              const { placed, count } = lanes(dayAppts)
              const dayStart = new Date(new Date(`${d}T00:00:00Z`).getTime() - OFFSET).getTime()
              const dayOff = (off ?? []).filter((o) => new Date(o.starts_at).getTime() < dayStart + DAY && new Date(o.ends_at).getTime() > dayStart)
              return (
                <div key={d} className={cn("relative border-s border-neutral-200", d === today && "bg-rose-50/30")} style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h) => (
                    <div key={h} style={{ top: (h - firstHour) * HOUR_PX, height: HOUR_PX }} className="absolute inset-x-0 border-b border-neutral-100" />
                  ))}
                  {dayOff.map((o) => {
                    const s = Math.max(new Date(o.starts_at).getTime(), dayStart)
                    const e = Math.min(new Date(o.ends_at).getTime(), dayStart + DAY)
                    const top = Math.max(0, ((s - dayStart) / 60_000 - firstHour * 60) / 60) * HOUR_PX
                    const bottom = Math.min(hours.length * HOUR_PX, (((e - dayStart) / 60_000 - firstHour * 60) / 60) * HOUR_PX)
                    if (bottom <= top) return null
                    return (
                      <div key={o.id} title={`${o.agent_slug ? names[o.agent_slug] ?? o.agent_slug : "Office closed"}${o.reason ? `: ${o.reason}` : ""}`} className="absolute inset-x-0 bg-[repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5_6px,#ececec_6px,#ececec_12px)] px-1 pt-1 text-[10px] text-neutral-500" style={{ top, height: bottom - top }}>
                        {o.agent_slug ? names[o.agent_slug] ?? o.agent_slug : "Office"} off{o.reason ? ` · ${o.reason}` : ""}
                      </div>
                    )
                  })}
                  {d === today && nowMin >= firstHour * 60 && nowMin <= lastHour * 60 && <div className="absolute inset-x-0 z-10 h-0.5 bg-rose-500" style={{ top: ((nowMin - firstHour * 60) / 60) * HOUR_PX }} />}
                  {placed.map(({ a, lane }) => {
                    const top = ((dubaiMinutes(a.starts_at) - firstHour * 60) / 60) * HOUR_PX
                    const height = Math.max(22, ((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 3600_000) * HOUR_PX - 2)
                    const color = advisorColor(a.agent_slug, allSlugs)
                    return (
                      <Link
                        key={a.id}
                        href={href({ open: a.id })}
                        className={cn(
                          "absolute z-20 overflow-hidden rounded-lg border-s-4 px-2 py-1 text-[11px] leading-tight shadow-sm ring-1 ring-black/5 hover:z-30 hover:shadow-md",
                          a.status === "cancelled" ? "bg-neutral-50 text-neutral-400 line-through" : a.status === "no_show" ? "bg-red-50 text-red-800" : a.status === "completed" ? "bg-neutral-100 text-neutral-600" : "bg-white text-neutral-900",
                          sp.open === a.id && "ring-2 ring-rose-400",
                        )}
                        style={{ top, height, left: `calc(${(lane / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)`, borderInlineStartColor: color }}
                      >
                        <span className="block font-semibold">
                          {dubaiFormat(a.starts_at, { hour: "2-digit", minute: "2-digit" })} {a.name}
                        </span>
                        <span className="block text-neutral-500">
                          {label(PURPOSES, a.purpose)} · {names[a.agent_slug] ?? a.agent_slug}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {open && (
          <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-neutral-200 xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{label(PURPOSES, open.purpose)}</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900">{open.name}</h2>
                <p className="text-sm text-neutral-600">
                  {dubaiFormat(open.starts_at, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} – {dubaiFormat(open.ends_at, { hour: "2-digit", minute: "2-digit" })} (Dubai)
                </p>
              </div>
              <Link href={href({ open: undefined })} aria-label="Close" className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </Link>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <div>
                <dt className="inline text-neutral-500">Advisor: </dt>
                <dd className="inline text-neutral-900">{names[open.agent_slug] ?? open.agent_slug}</dd>
              </div>
              <div>
                <dt className="inline text-neutral-500">How: </dt>
                <dd className="inline text-neutral-900">{label(MODES, open.mode)}</dd>
              </div>
              <div>
                <dt className="inline text-neutral-500">Contact: </dt>
                <dd className="inline">
                  <a href={`https://wa.me/${open.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                    {open.phone}
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${open.email}`} className="hover:underline">
                    {open.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="inline text-neutral-500">Reference: </dt>
                <dd className="inline font-mono text-xs">{open.reference}</dd>
              </div>
              {open.meeting_url && (
                <div>
                  <a href={open.meeting_url} target="_blank" rel="noopener noreferrer" className="text-rose-700 hover:underline">
                    Join the meeting
                  </a>
                </div>
              )}
              {open.property_slug && <div className="text-neutral-700">Property: {open.property_slug}</div>}
              {open.budget && <div className="text-neutral-700">Budget: {open.budget}</div>}
              {open.timeline && <div className="text-neutral-700">Timeline: {open.timeline}</div>}
              {open.notes && <p className="mt-2 rounded-lg bg-sand-100 p-2 text-neutral-700">“{open.notes}”</p>}
            </dl>
            {open.contact_id && (
              <Link href={`/admin/crm/${open.contact_id}`} className="mt-4 inline-block text-sm font-semibold text-neutral-900 underline">
                Open in CRM
              </Link>
            )}
            <div className="mt-4">
              <AppointmentActions id={open.id} status={open.status} agent={open.agent_slug} agents={(agents ?? []).map((g) => ({ value: g.slug, label: g.name }))} />
            </div>
            {open.status === "confirmed" && (
              <RescheduleForm
                id={open.id}
                date={dubaiDay(open.starts_at)}
                time={new Date(new Date(open.starts_at).getTime() + OFFSET).toISOString().slice(11, 16)}
                minutes={Math.round((new Date(open.ends_at).getTime() - new Date(open.starts_at).getTime()) / 60_000)}
                agent={open.agent_slug}
                agents={agents ?? []}
              />
            )}
            <MeetingCopilot key={open.id} id={open.id} status={open.status} startsAt={open.starts_at} brief={open.brief} outcome={open.outcome} client={{ name: open.name, email: open.email, phone: open.phone }} />
          </aside>
        )}
      </div>
    </div>
  )
}
