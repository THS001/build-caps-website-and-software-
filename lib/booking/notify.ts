import "server-only"
import { randomBytes } from "node:crypto"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import type { Locale } from "@/i18n/locales"
import { translator } from "@/i18n/messages"
import { intlLocale } from "@/lib/format"
import { localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import { sendEmail, teamInbox } from "@/lib/email/send"
import { renderEmail } from "@/lib/email/templates"
import { icsText } from "@/lib/booking/calendar-links"
import { adminClient } from "@/lib/supabase/admin"
import { sendWhatsAppTemplate } from "@/lib/whatsapp"

export type Appointment = {
  id: string
  reference: string
  manage_token: string
  purpose: string
  mode: string
  agent_slug: string
  starts_at: string
  ends_at: string
  timezone: string
  name: string
  email: string
  phone: string
  language: string
  notes: string | null
  property_slug: string | null
  meeting_url: string | null
}

/** meetingUrl: the advisor's own video room (Zoom, Teams, Meet), set in Admin → Team. */
export type AdvisorContact = { slug: string; name: string; email: string | null; meetingUrl: string | null }

const baseUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? site.url
const localeOf = (a: Appointment): Locale => (hasLocale(routing.locales, a.language) ? a.language : "en")

export function manageUrl(a: Appointment) {
  return new URL(localizedPath(`/book/manage/${a.manage_token}`, localeOf(a)), baseUrl()).toString()
}

/** A free Jitsi room for video calls when the advisor has no meeting link of their own. */
function fallbackMeetingUrl(reference: string) {
  return `https://meet.jit.si/Buildcaps-${reference}-${randomBytes(4).toString("hex")}`
}

async function labels(a: Appointment) {
  const locale = localeOf(a)
  const t = await translator(locale)
  const tag = intlLocale(locale)
  const start = new Date(a.starts_at)
  const date = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", timeZone: a.timezone }).format(start)
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: a.timezone, timeZoneName: "short" }).format(start)
  const dubai = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(start)
  return {
    locale,
    t,
    date,
    time,
    dubai,
    purpose: t(`booking.steps.purpose.options.${a.purpose}.label`),
    mode: t(`booking.steps.mode.options.${a.mode}.label`),
    office: t("footer.address"),
  }
}

function calendarEvent(a: Appointment, purpose: string, location: string, extra: string) {
  return {
    id: a.reference,
    start: new Date(a.starts_at),
    minutes: Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000),
    title: `Buildcaps: ${purpose}`,
    description: `${extra}\n\nReference ${a.reference}\nManage: ${manageUrl(a)}`,
    location,
  }
}

type Kind = "confirmation" | "reminder24" | "reminder1" | "rescheduled" | "cancelled" | "feedback" | "noShow"

/** The visitor's email for a lifecycle event, in their language and timezone. */
export async function emailVisitor(kind: Kind, a: Appointment, advisor: AdvisorContact) {
  const l = await labels(a)
  const e = (key: string, values?: Record<string, string>) => l.t(`emails.${key}`, values)
  const where = a.mode === "office" ? l.office : a.mode === "whatsapp" ? e("whatsappCall", { advisor: advisor.name, phone: a.phone }) : a.meeting_url ?? l.mode

  const details =
    kind === "cancelled" || kind === "feedback" || kind === "noShow"
      ? undefined
      : [
          { label: e("labels.when"), value: `${l.date}, ${l.time}${a.timezone !== "Asia/Dubai" ? ` (${l.dubai} ${e("labels.dubaiTime")})` : ""}` },
          { label: e("labels.how"), value: l.mode },
          ...(a.mode === "video" && a.meeting_url ? [{ label: e("labels.link"), value: a.meeting_url, href: a.meeting_url }] : []),
          ...(a.mode === "office" || a.mode === "whatsapp" ? [{ label: e("labels.where"), value: where }] : []),
          { label: e("labels.advisor"), value: advisor.name },
          { label: e("labels.reference"), value: a.reference },
        ]

  const values = { advisor: advisor.name, date: l.date, time: l.time }
  const cta =
    kind === "cancelled" || kind === "noShow"
      ? { label: e(`${kind}.cta`), href: new URL(localizedPath("/book", l.locale), baseUrl()).toString() }
      : kind === "feedback"
        ? { label: e("feedback.cta"), href: `${manageUrl(a)}#review` }
        : { label: e("manage"), href: manageUrl(a) }

  const { html, text } = await renderEmail({
    locale: l.locale,
    preheader: e(`${kind}.body`, values),
    heading: e(`${kind}.heading`),
    paragraphs: [e("greeting", { name: a.name.split(" ")[0] }), e(`${kind}.body`, values)],
    details,
    cta,
    footnote: cta?.href === manageUrl(a) ? e("manageNote") : undefined,
  })

  const withInvite = kind === "confirmation" || kind === "rescheduled"
  return sendEmail({
    to: a.email,
    subject: e(`${kind}.subject`, values),
    html,
    text,
    replyTo: advisor.email ?? teamInbox,
    attachments: withInvite
      ? [{ filename: "buildcaps-appointment.ics", contentType: "text/calendar; charset=utf-8", content: icsText(calendarEvent(a, l.purpose, where, `${l.mode} · ${advisor.name}`)) }]
      : undefined,
  })
}

/** Internal notification (English): new, moved or cancelled bookings. */
export async function emailTeam(kind: "new" | "moved" | "cancelled", a: Appointment, advisor: AdvisorContact) {
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(a.starts_at))
  const title = { new: "New booking", moved: "Booking moved", cancelled: "Booking cancelled" }[kind]
  const { html, text } = await renderEmail({
    locale: "en",
    preheader: `${title}: ${a.name}, ${when}`,
    heading: `${title}: ${a.reference}`,
    paragraphs: [`${a.name} · ${a.purpose} · ${a.mode} · ${when} (Dubai)`],
    details: [
      { label: "Advisor", value: advisor.name },
      { label: "Email", value: a.email, href: `mailto:${a.email}` },
      { label: "Phone / WhatsApp", value: a.phone, href: `https://wa.me/${a.phone.replace(/\D/g, "")}` },
      { label: "Language", value: a.language },
      ...(a.property_slug ? [{ label: "Property", value: a.property_slug, href: `${baseUrl()}/properties/${a.property_slug}` }] : []),
      ...(a.meeting_url ? [{ label: "Meeting link", value: a.meeting_url, href: a.meeting_url }] : []),
      ...(a.notes ? [{ label: "Notes", value: a.notes }] : []),
    ],
    cta: { label: "Open in admin", href: `${baseUrl()}/admin/appointments` },
  })
  const to = [...new Set([advisor.email, teamInbox].filter(Boolean))] as string[]
  return sendEmail({ to, subject: `${title}: ${a.name} · ${when}`, html, text, replyTo: a.email })
}

/** Video calls use the advisor's own meeting room, or a free Jitsi room. Other modes have no link. */
export function meetingLinkFor(a: Pick<Appointment, "mode" | "reference" | "meeting_url">, advisor: AdvisorContact) {
  if (a.mode !== "video") return null
  if (advisor.meetingUrl) return advisor.meetingUrl
  return a.meeting_url?.startsWith("https://meet.jit.si/") ? a.meeting_url : fallbackMeetingUrl(a.reference)
}

/**
 * Stores the right meeting link on a booking: after it's made, and after it
 * moves to another advisor. `changed` tells the caller the visitor needs the new link.
 */
export async function syncMeetingLink<T extends Appointment>(a: T, advisor: AdvisorContact): Promise<{ appointment: T; changed: boolean }> {
  const url = meetingLinkFor(a, advisor)
  if (url === a.meeting_url) return { appointment: a, changed: false }
  const { error } = await adminClient().from("appointments").update({ meeting_url: url }).eq("id", a.id)
  if (error) {
    console.error("Meeting link not saved:", error.message)
    return { appointment: a, changed: false }
  }
  return { appointment: { ...a, meeting_url: url }, changed: true }
}

/** Optional WhatsApp confirmation through an approved Cloud API template. */
export async function whatsappConfirmation(a: Appointment, advisor: AdvisorContact) {
  const l = await labels(a)
  await sendWhatsAppTemplate(a.phone, l.locale, [a.name.split(" ")[0], `${l.date}, ${l.time}`, advisor.name]).catch(() => false)
}
