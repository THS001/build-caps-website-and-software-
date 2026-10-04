// "Add to calendar" links and an .ics file. No account or API needed; used by the
// booking confirmation screen and attached to confirmation emails.

export type CalendarEvent = { id: string; start: Date; minutes: number; title: string; description: string; location: string }

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

function end(event: CalendarEvent) {
  return new Date(event.start.getTime() + event.minutes * 60_000)
}

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(end(event))}`,
    details: event.description,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export function outlookCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: end(event).toISOString(),
    body: event.description,
    location: event.location,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`
}

// RFC 5545 text escaping.
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

export function icsText(event: CalendarEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Buildcaps Real Estate//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@buildcaps.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(end(event))}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.join("\r\n")
}

/**
 * A subscribable calendar (many events), e.g. an advisor's bookings feed.
 * Calendar apps refresh it on their own schedule (usually every few hours).
 */
export function icsCalendar(name: string, events: (CalendarEvent & { status?: "CONFIRMED" | "CANCELLED"; updated?: Date })[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Buildcaps Real Estate//Bookings feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Asia/Dubai",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ]
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@buildcaps.com`,
      `DTSTAMP:${stamp(event.updated ?? new Date())}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(end(event))}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      `LOCATION:${escape(event.location)}`,
      `STATUS:${event.status ?? "CONFIRMED"}`,
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

/** Browser download of the same file. */
export function icsFile(event: CalendarEvent) {
  return new Blob([icsText(event)], { type: "text/calendar;charset=utf-8" })
}
