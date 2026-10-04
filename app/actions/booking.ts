"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { locales, type Locale } from "@/i18n/locales"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { availableSlots, bookableAdvisors, candidatesFor, type Slot } from "@/lib/booking/availability"
import { workingDays } from "@/lib/booking/slots"
import { getBookingSchedule } from "@/lib/booking/settings"
import { emailTeam, emailVisitor, manageUrl, syncMeetingLink, whatsappConfirmation, type AdvisorContact, type Appointment } from "@/lib/booking/notify"
import { rateLimited, verifyHuman } from "@/lib/security"

export type BookingResult =
  | { status: "success"; id: string; advisor: string; manageUrl?: string; meetingUrl?: string | null }
  | { status: "error"; reason: "invalid" | "slotTaken" | "generic" | "human" | "rateLimited" }

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Free slots for a day, for one advisor or the best match for a language. */
export async function fetchSlots(input: { advisor: string; day: string; language: string }): Promise<Slot[]> {
  const parsed = z.object({ advisor: z.string().max(80), day, language: z.enum(locales) }).safeParse(input)
  if (!parsed.success || !(await bookableDay(parsed.data.day))) return []
  const advisors = await bookableAdvisors()
  return availableSlots(candidatesFor(advisors, parsed.data.advisor, parsed.data.language as Locale), parsed.data.day)
}

const schema = z.object({
  purpose: z.enum(["strategy", "viewing", "valuation", "mortgage", "goldenVisa"]),
  mode: z.enum(["video", "office", "onsite", "whatsapp"]),
  advisor: z.string().max(80),
  start: z.string().datetime(),
  timezone: z.string().max(64),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(40),
  language: z.string().refine((l) => hasLocale(routing.locales, l)),
  notes: z.string().trim().max(2000).optional(),
  property: z.string().max(120).optional(),
  project: z.string().max(120).optional(),
  budget: z.string().max(40).optional(),
  timeline: z.string().max(40).optional(),
  consent: z.literal(true),
  turnstile: z.string().max(4000).optional(),
})

export type BookingInput = z.input<typeof schema>

/** Only days inside the booking window (Admin → Availability) can be booked. */
async function bookableDay(value: string) {
  const schedule = await getBookingSchedule()
  return workingDays(new Date(), schedule.daysAhead, schedule.openWeekdays).includes(value)
}

const contact = (a: { slug: string; name: string; email: string | null; meetingUrl: string | null }): AdvisorContact => a

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { status: "error", reason: "invalid" }
  const b = parsed.data
  if (await rateLimited("booking", 5, 10 * 60_000)) return { status: "error", reason: "rateLimited" }
  if (!(await verifyHuman(b.turnstile))) return { status: "error", reason: "human" }

  // The chosen advisor, or the first best-match advisor who is free at that time.
  const advisors = await bookableAdvisors()
  const day = new Date(new Date(b.start).getTime() + 4 * 3600_000).toISOString().slice(0, 10)
  if (!(await bookableDay(day))) return { status: "error", reason: "slotTaken" }
  const slots = await availableSlots(candidatesFor(advisors, b.advisor, b.language as Locale), day)
  const slot = slots.find((s) => s.start === new Date(b.start).toISOString())
  if (!slot) return { status: "error", reason: "slotTaken" }
  const advisor = advisors.find((a) => a.slug === slot.advisor)!

  if (!adminConfigured) {
    // No database yet: confirm in development so the flow can be tried, refuse in production.
    if (process.env.NODE_ENV === "production") return { status: "error", reason: "generic" }
    return { status: "success", id: `DEV-${Date.now().toString(36).toUpperCase()}`, advisor: advisor.name }
  }

  const start = new Date(b.start)
  const { slotMinutes } = await getBookingSchedule()
  const { data, error } = await adminClient().rpc("book_appointment", {
    p: {
      purpose: b.purpose,
      mode: b.mode,
      agent_slug: advisor.slug,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + slotMinutes * 60_000).toISOString(),
      timezone: b.timezone,
      name: b.name,
      email: b.email,
      phone: b.phone,
      language: b.language,
      notes: b.notes,
      property_slug: b.property,
      project_slug: b.project,
      budget: b.budget,
      timeline: b.timeline,
      source: "website",
    },
  })
  if (error) return { status: "error", reason: /slot_taken|slot_in_past/.test(error.message) ? "slotTaken" : "generic" }
  const { appointment } = await syncMeetingLink(data as Appointment, contact(advisor))

  await Promise.all([
    emailVisitor("confirmation", appointment, contact(advisor)),
    emailTeam("new", appointment, contact(advisor)),
    whatsappConfirmation(appointment, contact(advisor)),
  ])

  return { status: "success", id: appointment.reference, advisor: advisor.name, manageUrl: manageUrl(appointment), meetingUrl: appointment.meeting_url }
}

/* ── Self-service (link in every email) ─────────────────────────────── */

async function byToken(token: string) {
  if (!adminConfigured || !z.string().uuid().safeParse(token).success) return null
  const { data } = await adminClient().from("appointments").select("*").eq("manage_token", token).maybeSingle()
  return data as (Appointment & { status: string }) | null
}

async function advisorFor(slug: string): Promise<AdvisorContact> {
  const advisors = await bookableAdvisors()
  const a = advisors.find((x) => x.slug === slug)
  return a ? contact(a) : { slug, name: "Buildcaps", email: null, meetingUrl: null }
}

export async function cancelBooking(token: string): Promise<{ ok: boolean }> {
  const appt = await byToken(token)
  if (!appt || appt.status !== "confirmed") return { ok: false }
  const { error } = await adminClient().from("appointments").update({ status: "cancelled" }).eq("id", appt.id)
  if (error) return { ok: false }
  const advisor = await advisorFor(appt.agent_slug)
  await Promise.all([emailVisitor("cancelled", appt, advisor), emailTeam("cancelled", appt, advisor)])
  return { ok: true }
}

export async function rescheduleBooking(token: string, start: string): Promise<{ ok: boolean; reason?: "slotTaken" | "generic" }> {
  const appt = await byToken(token)
  if (!appt || appt.status !== "confirmed" || !z.string().datetime().safeParse(start).success) return { ok: false, reason: "generic" }
  const begin = new Date(start)
  const { data, error } = await adminClient().rpc("reschedule_appointment", {
    p_token: token,
    p_start: begin.toISOString(),
    // A moved booking keeps its original length.
    p_end: new Date(begin.getTime() + (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime())).toISOString(),
  })
  if (error) return { ok: false, reason: /slot_taken|slot_in_past/.test(error.message) ? "slotTaken" : "generic" }
  const moved = data as Appointment
  const advisor = await advisorFor(moved.agent_slug)
  await Promise.all([emailVisitor("rescheduled", moved, advisor), emailTeam("moved", moved, advisor)])
  return { ok: true }
}

/** Free slots for the advisor who already owns this booking. */
export async function fetchRescheduleSlots(token: string, dayValue: string): Promise<Slot[]> {
  const appt = await byToken(token)
  if (!appt || !day.safeParse(dayValue).success || !(await bookableDay(dayValue))) return []
  const advisors = await bookableAdvisors()
  return availableSlots(candidatesFor(advisors, appt.agent_slug, "en"), dayValue)
}

/* ── Verified reviews ─────────────────────────────────────────────────── */

export type ReviewState = { status: "idle" | "done" | "error" }

const reviewSchema = z.object({
  token: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  first_name: z.preprocess((v) => (v === "" || v === null ? null : v), z.string().trim().max(60).nullable()),
  comment: z.preprocess((v) => (v === "" || v === null ? null : v), z.string().trim().max(1500).nullable()),
  locale: z.string().refine((l) => hasLocale(routing.locales, l)),
})

/**
 * A review from the private link in the booking emails. Only a meeting that
 * took place can be reviewed, once; staff approve it before it is shown.
 */
export async function submitReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse({ token: form.get("token"), rating: form.get("rating"), first_name: form.get("first_name"), comment: form.get("comment"), locale: form.get("locale") })
  if (!parsed.success || !adminConfigured || (await rateLimited("review", 5, 10 * 60_000))) return { status: "error" }
  const { token, ...review } = parsed.data
  const supabase = adminClient()
  const { data: appt } = await supabase.from("appointments").select("id, agent_slug, status, ends_at, contact_id").eq("manage_token", token).maybeSingle()
  const tookPlace = appt && (appt.status === "completed" || (appt.status === "confirmed" && new Date(appt.ends_at).getTime() < Date.now()))
  if (!tookPlace) return { status: "error" }
  const { error } = await supabase.from("advisor_reviews").insert({ appointment_id: appt.id, agent_slug: appt.agent_slug, ...review })
  if (error && error.code !== "23505") return { status: "error" }
  if (!error && appt.contact_id) await supabase.from("contact_activities").insert({ contact_id: appt.contact_id, kind: "system", body: `Left a ${review.rating}-star review${review.comment ? `: "${review.comment}"` : ""}` })
  return { status: "done" }
}
