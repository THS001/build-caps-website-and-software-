import "server-only"
import type { Locale } from "@/i18n/locales"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { getAgents } from "@/lib/data"
import { slotsFor as sampleSlots } from "./slots"
import { getBookingSchedule } from "./settings"

const DUBAI_OFFSET_H = 4 // Dubai is UTC+4 all year (no daylight saving)
const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, starts: "09:00", ends: "19:00" }))

export type Advisor = { slug: string; name: string; role: string; languages: Locale[]; email: string | null; meetingUrl: string | null }
export type Slot = { start: string; advisor: string }

/** Bookable advisors (everyone except the CEO), with their email and video meeting link. */
export async function bookableAdvisors(): Promise<Advisor[]> {
  if (!adminConfigured) {
    return (await getAgents())
      .filter((a) => a.role !== "ceo")
      .map((a) => ({ slug: a.slug, name: a.name, role: a.role, languages: a.languages, email: null, meetingUrl: null }))
  }
  const { data, error } = await adminClient()
    .from("agents")
    .select("slug, name, role, languages, email, meeting_url, sort_order")
    .eq("active", true)
    .neq("role", "ceo")
    .order("sort_order")
  if (error) throw new Error(error.message)
  return (data ?? []).map((a) => ({
    slug: a.slug,
    name: a.name,
    role: a.role,
    languages: a.languages as Locale[],
    email: (a.email as string | null) ?? null,
    meetingUrl: (a.meeting_url as string | null) ?? null,
  }))
}

/** "best" = advisors who speak the visitor's language, advisors before directors. */
export function candidatesFor(advisors: Advisor[], choice: string, language: Locale) {
  if (choice !== "best") return advisors.filter((a) => a.slug === choice)
  const speaks = advisors.filter((a) => a.languages.includes(language))
  const pool = speaks.length ? speaks : advisors
  return [...pool].sort((a, b) => Number(a.role === "salesDirector") - Number(b.role === "salesDirector"))
}

function dubaiInstant(day: string, hhmm: string) {
  const [y, m, d] = day.split("-").map(Number)
  const [h, min] = hhmm.split(":").map(Number)
  return new Date(Date.UTC(y, m - 1, d, h - DUBAI_OFFSET_H, min))
}

async function workingHours(slugs: string[]) {
  const hours = new Map<string, { weekday: number; starts: string; ends: string }[]>()
  if (adminConfigured && slugs.length) {
    const { data } = await adminClient().from("agent_hours").select("agent_slug, weekday, starts, ends").in("agent_slug", slugs)
    for (const row of data ?? []) {
      const list = hours.get(row.agent_slug) ?? []
      list.push({ weekday: row.weekday, starts: String(row.starts).slice(0, 5), ends: String(row.ends).slice(0, 5) })
      hours.set(row.agent_slug, list)
    }
  }
  return (slug: string) => hours.get(slug) ?? DEFAULT_HOURS
}

/** Free start times on a Dubai date, each with the advisor who would take it. */
export async function availableSlots(candidates: Advisor[], day: string, now = new Date()): Promise<Slot[]> {
  if (!candidates.length) return []
  if (!adminConfigured) {
    // Sample availability while the site runs without a database.
    const seen = new Map<string, string>()
    for (const a of candidates) for (const s of sampleSlots(day, a.slug, now)) if (!seen.has(s.toISOString())) seen.set(s.toISOString(), a.slug)
    return [...seen.entries()].sort().map(([start, advisor]) => ({ start, advisor }))
  }

  const schedule = await getBookingSchedule()
  const SLOT_MS = schedule.slotMinutes * 60_000
  const MIN_NOTICE_MS = schedule.minNoticeHours * 3600_000
  const dayStart = dubaiInstant(day, "00:00")
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000)
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
  const hoursOf = await workingHours(candidates.map((a) => a.slug))

  // Bookings (with the buffer) and time off, straight from the database.
  const supabase = adminClient()
  const busyRows = await Promise.all(candidates.map((a) => supabase.rpc("agent_busy", { p_agent: a.slug, p_from: dayStart.toISOString(), p_to: dayEnd.toISOString() })))

  const slots = new Map<string, string>()
  candidates.forEach((advisor, i) => {
    const busy = ((busyRows[i].data as { starts_at: string; ends_at: string }[] | null) ?? []).map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()])
    for (const window of hoursOf(advisor.slug).filter((h) => h.weekday === weekday)) {
      const end = dubaiInstant(day, window.ends).getTime()
      for (let t = dubaiInstant(day, window.starts).getTime(); t + SLOT_MS <= end; t += SLOT_MS) {
        const slotEnd = t + SLOT_MS
        if (t - now.getTime() < MIN_NOTICE_MS) continue
        if (busy.some(([s, e]) => s < slotEnd && e > t)) continue
        const iso = new Date(t).toISOString()
        if (!slots.has(iso)) slots.set(iso, advisor.slug)
      }
    }
  })
  return [...slots.entries()].sort().map(([start, advisor]) => ({ start, advisor }))
}
