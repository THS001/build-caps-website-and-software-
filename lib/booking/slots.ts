// Appointment slots. Dubai is UTC+4 all year (no daylight saving), which keeps the maths exact.
// Real availability comes from lib/booking/availability.ts; the sample slots here are
// only used while the site runs without a database.

export const DUBAI_TZ = "Asia/Dubai"
const DUBAI_OFFSET_H = 4
export const SLOT_MINUTES = 45
const DAY_START = { h: 9, m: 0 }
const LAST_START = { h: 18, m: 15 }
const MIN_NOTICE_MS = 2 * 60 * 60 * 1000

/** Dubai calendar date (YYYY-MM-DD) of an instant. */
export function dubaiDate(instant: Date) {
  return new Date(instant.getTime() + DUBAI_OFFSET_H * 3600_000).toISOString().slice(0, 10)
}

/** The next `count` open days in Dubai (by default Monday to Saturday), starting today. */
export function workingDays(now: Date, count: number, openWeekdays: number[] = [1, 2, 3, 4, 5, 6]) {
  const days: string[] = []
  const cursor = new Date(`${dubaiDate(now)}T00:00:00Z`)
  if (!openWeekdays.length) return days
  while (days.length < count) {
    if (openWeekdays.includes(cursor.getUTCDay())) days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Sample availability: roughly one slot in four is already booked. */
function isTaken(advisor: string, start: Date) {
  return hash(`${advisor}|${start.toISOString()}`) % 4 === 0
}

/** Bookable start times (UTC instants) on a Dubai date for an advisor. */
export function slotsFor(day: string, advisor: string, now: Date) {
  const [y, mo, d] = day.split("-").map(Number)
  const out: Date[] = []
  for (let minutes = DAY_START.h * 60 + DAY_START.m; minutes <= LAST_START.h * 60 + LAST_START.m; minutes += SLOT_MINUTES) {
    const start = new Date(Date.UTC(y, mo - 1, d, Math.floor(minutes / 60) - DUBAI_OFFSET_H, minutes % 60))
    if (start.getTime() - now.getTime() < MIN_NOTICE_MS) continue
    if (isTaken(advisor, start)) continue
    out.push(start)
  }
  return out
}
