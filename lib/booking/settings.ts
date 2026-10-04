import "server-only"
import { cache } from "react"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"

// Booking rules, edited in Admin → Availability (booking_settings and agent_hours).

export type BookingSchedule = {
  slotMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  daysAhead: number
  /** Weekdays (0 = Sunday) on which at least one advisor works. */
  openWeekdays: number[]
}

export const DEFAULT_SCHEDULE: BookingSchedule = { slotMinutes: 45, bufferMinutes: 15, minNoticeHours: 2, daysAhead: 14, openWeekdays: [1, 2, 3, 4, 5, 6] }

export const getBookingSchedule = cache(async (): Promise<BookingSchedule> => {
  if (!adminConfigured) return DEFAULT_SCHEDULE
  const supabase = adminClient()
  const [{ data: settings }, { data: hours }, { data: advisors }] = await Promise.all([
    supabase.from("booking_settings").select("slot_minutes, buffer_minutes, min_notice_hours, days_ahead").limit(1).maybeSingle(),
    supabase.from("agent_hours").select("agent_slug, weekday"),
    supabase.from("agents").select("slug").eq("active", true).neq("role", "ceo"),
  ])
  // An advisor without any hours rows works the default week (Monday to Saturday).
  const withHours = new Set((hours ?? []).map((h) => h.agent_slug))
  const open = new Set((hours ?? []).map((h) => Number(h.weekday)))
  if ((advisors ?? []).some((a) => !withHours.has(a.slug)) || !open.size) DEFAULT_SCHEDULE.openWeekdays.forEach((d) => open.add(d))
  return {
    slotMinutes: settings?.slot_minutes ?? DEFAULT_SCHEDULE.slotMinutes,
    bufferMinutes: settings?.buffer_minutes ?? DEFAULT_SCHEDULE.bufferMinutes,
    minNoticeHours: settings?.min_notice_hours ?? DEFAULT_SCHEDULE.minNoticeHours,
    daysAhead: settings?.days_ahead ?? DEFAULT_SCHEDULE.daysAhead,
    openWeekdays: [...open].sort(),
  }
})
