"use server"

import { attempt, attemptForm } from "@/lib/action-result"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import type { FormState } from "./actions"

// CRM, staff bookings and availability. Writes run as the signed-in staff member
// (RLS enforces roles); booking creation goes through the atomic database
// function with the service role, after the staff check here.

const STAGES = ["new", "contacted", "qualified", "meeting", "negotiation", "won", "lost"] as const
const optionalText = (max: number) => z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().trim().max(max).optional())

async function requireStaff() {
  const staff = await currentStaff()
  if (!staff) throw new Error("Please sign in again.")
  return staff
}

async function requireEditor() {
  const staff = await requireStaff()
  if (staff.role === "advisor") throw new Error("Only editors and admins can change this.")
  return staff
}

function fail(error: z.ZodError | string): FormState {
  if (typeof error === "string") return { status: "error", message: error }
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message
  return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
}

/* ── Contacts ──────────────────────────────────────────────────────────── */

const newContact = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: optionalText(40),
  country: optionalText(80),
  locale: optionalText(8),
  source: optionalText(200),
  owner: optionalText(80),
  stage: z.enum(STAGES).default("new"),
  budget_aed: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).optional()),
  note: optionalText(5000),
})

/** A contact added by hand (phone call, walk-in, referral, event). */
export async function createContact(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    const staff = await requireStaff()
    const parsed = newContact.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const { note, ...data } = parsed.data
    const supabase = await serverClient()
    const { data: existing } = await supabase.from("contacts").select("id").eq("email", data.email).maybeSingle()
    if (existing) return { status: "error", message: "A contact with this email already exists.", fieldErrors: { email: `Already in the CRM: /admin/crm/${existing.id}` } }
    const { data: row, error } = await supabase.from("contacts").insert({ ...data, source: data.source ?? "manual" }).select("id").single()
    if (error) return fail(error.message)
    await supabase.from("contact_activities").insert({ contact_id: row.id, kind: "system", body: `Added by ${staff.name}`, author: staff.id })
    if (note) await supabase.from("contact_activities").insert({ contact_id: row.id, kind: "note", body: note, author: staff.id })
    redirect(`/admin/crm/${row.id}`)
  })
}

// Empty means "clear it" (null), unlike the create form where empty means "not given".
const clearableText = (max: number) => z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(max).nullable())

const contactPatch = z
  .object({
    name: clearableText(120),
    phone: clearableText(40),
    country: clearableText(80),
    locale: optionalText(8),
    stage: z.enum(STAGES),
    owner: z.string().max(80).nullable(),
    score: z.number().int().min(0).max(100).nullable(),
    budget_aed: z.number().int().min(0).nullable(),
    value_aed: z.number().int().min(0).nullable(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    interests: z.array(z.string().trim().min(1).max(40)).max(20),
    lost_reason: z.string().trim().max(300).nullable(),
    next_follow_up_at: z.string().datetime().nullable(),
  })
  .partial()

export async function updateContact(id: string, patch: z.input<typeof contactPatch>) {
  return attempt(async () => {
    await requireStaff()
    const parsed = contactPatch.safeParse(patch)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid change")
    const supabase = await serverClient()
    const { error } = await supabase.from("contacts").update(parsed.data).eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin/crm", "layout")
  })
}

/** Deletes a person and everything we hold about them (enquiries, bookings, notes). Admins only. */
export async function deleteContact(id: string) {
  return attempt(async () => {
    const staff = await requireStaff()
    if (staff.role !== "admin") throw new Error("Only admins can delete contacts.")
    const { adminClient } = await import("@/lib/supabase/admin")
    const supabase = adminClient()
    await supabase.from("appointments").delete().eq("contact_id", id)
    await supabase.from("leads").delete().eq("contact_id", id)
    const { error } = await supabase.from("contacts").delete().eq("id", id)
    if (error) throw new Error(error.message)
    // The page goes back to the CRM itself: a redirect from here would reach the button as an error.
    revalidatePath("/[locale]/admin/crm", "layout")
  })
}

/* ── Timeline and tasks ────────────────────────────────────────────────── */

export async function logActivity(contactId: string, kind: "note" | "call" | "email" | "whatsapp", body: string) {
  return attempt(async () => {
    const staff = await requireStaff()
    const text = z.string().trim().min(1).max(5000).parse(body)
    const supabase = await serverClient()
    const { error } = await supabase.from("contact_activities").insert({ contact_id: contactId, kind, body: text, author: staff.id })
    if (error) throw new Error(error.message)
    // Logging a call, email or WhatsApp means the person has been contacted.
    const { data: c } = await supabase.from("contacts").select("stage").eq("id", contactId).single()
    await supabase
      .from("contacts")
      .update({ last_activity_at: new Date().toISOString(), ...(c?.stage === "new" && kind !== "note" ? { stage: "contacted" } : {}) })
      .eq("id", contactId)
  })
}

export async function deleteActivity(id: string) {
  return attempt(async () => {
    await requireStaff()
    const supabase = await serverClient()
    const { error } = await supabase.from("contact_activities").delete().eq("id", id)
    if (error) throw new Error(error.message)
  })
}

export async function addTask(contactId: string, input: { title: string; dueAt: string; assignee: string | null }) {
  return attempt(async () => {
    const staff = await requireStaff()
    const t = z.object({ title: z.string().trim().min(1).max(300), dueAt: z.string().datetime(), assignee: z.string().max(80).nullable() }).parse(input)
    const supabase = await serverClient()
    const { error } = await supabase.from("contact_tasks").insert({ contact_id: contactId, title: t.title, due_at: t.dueAt, assignee: t.assignee, created_by: staff.id })
    if (error) throw new Error(error.message)
    // The earliest open task is the contact's next follow-up.
    await syncFollowUp(contactId)
  })
}

export async function completeTask(id: string, done: boolean) {
  return attempt(async () => {
    const staff = await requireStaff()
    const supabase = await serverClient()
    const { data: task, error } = await supabase.from("contact_tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id).select("contact_id, title").single()
    if (error) throw new Error(error.message)
    if (done) await supabase.from("contact_activities").insert({ contact_id: task.contact_id, kind: "task", body: task.title, author: staff.id })
    await syncFollowUp(task.contact_id)
  })
}

export async function deleteTask(id: string) {
  return attempt(async () => {
    await requireStaff()
    const supabase = await serverClient()
    const { data: task, error } = await supabase.from("contact_tasks").delete().eq("id", id).select("contact_id").single()
    if (error) throw new Error(error.message)
    await syncFollowUp(task.contact_id)
  })
}

async function syncFollowUp(contactId: string) {
  const supabase = await serverClient()
  const { data } = await supabase.from("contact_tasks").select("due_at").eq("contact_id", contactId).is("done_at", null).order("due_at").limit(1)
  await supabase.from("contacts").update({ next_follow_up_at: data?.[0]?.due_at ?? null }).eq("id", contactId)
}

/* ── Staff bookings ────────────────────────────────────────────────────── */

const DUBAI_OFFSET_MS = 4 * 3600_000
const dubaiToUtc = (date: string, time: string) => new Date(new Date(`${date}T${time}:00Z`).getTime() - DUBAI_OFFSET_MS)

const bookingSchema = z.object({
  contact_id: optionalText(40),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(6).max(40),
  language: z.string().max(8).default("en"),
  purpose: z.enum(["strategy", "viewing", "valuation", "mortgage", "goldenVisa"]),
  mode: z.enum(["video", "office", "onsite", "whatsapp"]),
  agent_slug: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  minutes: z.coerce.number().int().min(15).max(480),
  notes: optionalText(2000),
  property_slug: optionalText(120),
  force: z.preprocess((v) => v === "on", z.boolean()),
  notify: z.preprocess((v) => v === "on", z.boolean()),
})

/** A booking taken by phone, WhatsApp or at the office. */
export async function staffCreateBooking(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    const staff = await requireStaff()
    const parsed = bookingSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const b = parsed.data
    const start = dubaiToUtc(b.date, b.time)
    const { adminClient } = await import("@/lib/supabase/admin")
    const { data, error } = await adminClient().rpc("book_appointment", {
      p: {
        staff: true,
        force: b.force,
        created_by: staff.id,
        purpose: b.purpose,
        mode: b.mode,
        agent_slug: b.agent_slug,
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + b.minutes * 60_000).toISOString(),
        timezone: "Asia/Dubai",
        name: b.name,
        email: b.email,
        phone: b.phone,
        language: b.language,
        notes: b.notes,
        property_slug: b.property_slug,
        source: "admin",
      },
    })
    if (error) {
      if (/slot_taken/.test(error.message)) return fail("That advisor already has a booking or time off then. Pick another time, or tick “Allow overlap”.")
      if (/slot_in_past/.test(error.message)) return fail("That time has already passed.")
      return fail(error.message)
    }
    const booked = data as import("@/lib/booking/notify").Appointment & { contact_id: string }
    const notify = await import("@/lib/booking/notify")
    const { bookableAdvisors } = await import("@/lib/booking/availability")
    const advisor = (await bookableAdvisors()).find((a) => a.slug === booked.agent_slug) ?? { slug: booked.agent_slug, name: "Buildcaps", email: null, meetingUrl: null }
    const { appointment: appt } = await notify.syncMeetingLink(booked, advisor)
    if (b.notify) await Promise.all([notify.emailVisitor("confirmation", appt, advisor), notify.whatsappConfirmation(appt, advisor)])
    await notify.emailTeam("new", appt, advisor)
    redirect(`/admin/calendar?week=${b.date}&booked=${appt.reference}`)
  })
}

/** Moves or reassigns a booking from the calendar, with the same clash checks. */
export async function staffRescheduleBooking(input: { id: string; date: string; time: string; minutes: number; agent: string; force: boolean; notify: boolean }) {
  return attempt(async () => {
    await requireStaff()
    const r = z
      .object({ id: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), minutes: z.number().int().min(15).max(480), agent: z.string().min(1).max(80), force: z.boolean(), notify: z.boolean() })
      .parse(input)
    const start = dubaiToUtc(r.date, r.time)
    const supabase = await serverClient()
    const { data: before } = await supabase.from("appointments").select("*").eq("id", r.id).single()
    const { data, error } = await supabase.rpc("staff_reschedule_appointment", { p_id: r.id, p_start: start.toISOString(), p_end: new Date(start.getTime() + r.minutes * 60_000).toISOString(), p_agent: r.agent, p_force: r.force })
    if (error) throw new Error(/slot_taken/.test(error.message) ? "That advisor is busy or off at that time. Pick another time, or allow overlap." : error.message)
    const moved = data as import("@/lib/booking/notify").Appointment
    const notify = await import("@/lib/booking/notify")
    const { bookableAdvisors } = await import("@/lib/booking/availability")
    const advisor = (await bookableAdvisors()).find((a) => a.slug === moved.agent_slug) ?? { slug: moved.agent_slug, name: "Buildcaps", email: null, meetingUrl: null }
    // A video call that moves to another advisor gets their meeting room; the visitor always hears about a new link.
    const { appointment, changed } = await notify.syncMeetingLink(moved, advisor)
    if (r.notify || changed) await notify.emailVisitor("rescheduled", appointment, advisor)
    await notify.emailTeam("moved", appointment, advisor)
  })
}

/* ── Availability ──────────────────────────────────────────────────────── */

const hoursSchema = z.array(z.object({ weekday: z.number().int().min(0).max(6), starts: z.string().regex(/^\d{2}:\d{2}$/), ends: z.string().regex(/^\d{2}:\d{2}$/) }).refine((h) => h.ends > h.starts, "End must be after start")).max(21)

/** Replaces an advisor's weekly hours (Dubai time). An empty week means they take no bookings. */
export async function saveHours(agentSlug: string, rows: z.input<typeof hoursSchema>) {
  return attempt(async () => {
    await requireEditor()
    const hours = hoursSchema.parse(rows)
    const supabase = await serverClient()
    const { error: delError } = await supabase.from("agent_hours").delete().eq("agent_slug", agentSlug)
    if (delError) throw new Error(delError.message)
    if (hours.length) {
      const { error } = await supabase.from("agent_hours").insert(hours.map((h) => ({ agent_slug: agentSlug, ...h })))
      if (error) throw new Error(error.message)
    }
    revalidatePath("/[locale]/admin/availability", "page")
  })
}

const timeOffSchema = z.object({
  agent_slug: optionalText(80),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  from_time: optionalText(5),
  to_time: optionalText(5),
  reason: optionalText(200),
})

/** Days or hours off for one advisor, or for the whole office (public holidays). */
export async function addTimeOff(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = timeOffSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const t = parsed.data
    const starts = dubaiToUtc(t.from_date, t.from_time ?? "00:00")
    const ends = t.to_time ? dubaiToUtc(t.to_date, t.to_time) : new Date(dubaiToUtc(t.to_date, "00:00").getTime() + 86_400_000)
    if (ends <= starts) return fail("The end must be after the start.")
    const supabase = await serverClient()
    const { error } = await supabase.from("agent_time_off").insert({ agent_slug: t.agent_slug ?? null, starts_at: starts.toISOString(), ends_at: ends.toISOString(), reason: t.reason ?? null })
    if (error) return fail(error.message)
    revalidatePath("/[locale]/admin/availability", "page")
    return { status: "done", message: "Time off added." }
  })
}

export async function deleteTimeOff(id: string) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("agent_time_off").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin/availability", "page")
  })
}

const settingsSchema = z.object({
  slot_minutes: z.coerce.number().int().min(15).max(240),
  buffer_minutes: z.coerce.number().int().min(0).max(120),
  min_notice_hours: z.coerce.number().int().min(0).max(168),
  days_ahead: z.coerce.number().int().min(1).max(90),
})

export async function saveBookingSettings(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = settingsSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const supabase = await serverClient()
    const { error } = await supabase.from("booking_settings").update(parsed.data).eq("id", true)
    if (error) return fail(error.message)
    revalidatePath("/[locale]/admin/availability", "page")
    return { status: "done", message: "Booking rules saved. The website uses them straight away." }
  })
}

/** Creates (or replaces, which revokes the old link) a calendar feed. null = whole office. */
export async function regenerateFeed(agentSlug: string | null) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    let del = supabase.from("calendar_feeds").delete()
    del = agentSlug ? del.eq("agent_slug", agentSlug) : del.is("agent_slug", null)
    const { error: delError } = await del
    if (delError) throw new Error(delError.message)
    const { error } = await supabase.from("calendar_feeds").insert({ agent_slug: agentSlug })
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin/availability", "page")
  })
}

/** Free start times (Dubai, "HH:MM") for an advisor on a date, ignoring the visitor notice rule. */
export async function staffFreeSlots(agent: string, date: string) {
  return attempt(async () => {
    await requireStaff()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
    const { availableSlots, bookableAdvisors, candidatesFor } = await import("@/lib/booking/availability")
    const advisors = await bookableAdvisors()
    const slots = await availableSlots(candidatesFor(advisors, agent, "en"), date, new Date(0))
    const now = Date.now()
    return slots.filter((s) => new Date(s.start).getTime() > now).map((s) => new Date(new Date(s.start).getTime() + DUBAI_OFFSET_MS).toISOString().slice(11, 16))
  })
}

/* ── Team (advisors) ───────────────────────────────────────────────────── */

const agentSchema = z.object({
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  name: z.string().trim().min(2).max(120),
  role: z.enum(["propertyAdvisor", "seniorPropertyAdvisor", "salesDirector", "ceo"]),
  languages: z.array(z.string().max(8)).min(1, "Pick at least one language"),
  specialties: z.array(z.string().trim().min(1).max(60)).max(12),
  bio_en: z.string().trim().max(2000),
  brn: optionalText(40),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email().max(254).optional()),
  meeting_url: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().url().max(500).startsWith("https://", "Use an https:// link").optional()),
  photo_url: optionalText(1000),
  responds_within: z.string().trim().min(1).max(20),
  user_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  sort_order: z.coerce.number().int().min(0).max(10000),
  active: z.boolean(),
})

/** Adds or edits an advisor. Advisors take bookings and own CRM contacts. */
export async function saveAgent(originalSlug: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = agentSchema.safeParse({
      slug: form.get("slug"),
      name: form.get("name"),
      role: form.get("role"),
      languages: form.getAll("languages").map(String),
      specialties: String(form.get("specialties") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      bio_en: form.get("bio_en") ?? "",
      brn: form.get("brn"),
      email: form.get("email"),
      meeting_url: form.get("meeting_url"),
      photo_url: form.get("photo_url"),
      responds_within: form.get("responds_within") || "1h",
      user_id: form.get("user_id"),
      sort_order: form.get("sort_order") || 100,
      active: form.get("active") === "on",
    })
    if (!parsed.success) return fail(parsed.error)
    const { bio_en, ...rest } = parsed.data
    const supabase = await serverClient()
    const { data: existing } = originalSlug ? await supabase.from("agents").select("bio").eq("slug", originalSlug).single() : { data: null }
    const bio = { ...((existing?.bio as Record<string, string>) ?? {}), en: bio_en }
    const row = { ...rest, bio, brn: rest.brn ?? null, email: rest.email ?? null, meeting_url: rest.meeting_url ?? null, photo_url: rest.photo_url ?? null, user_id: rest.user_id ?? null }
    const { error } = originalSlug ? await supabase.from("agents").update(row).eq("slug", originalSlug) : await supabase.from("agents").insert(row)
    if (error) return fail(error.code === "23505" ? "That URL slug is already used by another advisor." : error.message)
    const { revalidateTag } = await import("next/cache")
    const { CONTENT_TAG } = await import("@/lib/supabase/config")
    revalidateTag(CONTENT_TAG)
    redirect("/admin/team")
  })
}

/* ── Advisor Copilot ───────────────────────────────────────────────────── */

async function loadAppointment(id: string) {
  const supabase = await serverClient()
  const { data, error } = await supabase.from("appointments").select("*").eq("id", z.string().uuid().parse(id)).single()
  if (error) throw new Error(error.message)
  return data as import("@/lib/booking/notify").Appointment & { contact_id: string | null; status: string; outcome: unknown }
}

/** Writes (or rewrites) the pre-meeting brief and keeps it on the appointment. */
export async function prepareBrief(id: string) {
  return attempt(async () => {
    await requireStaff()
    const appt = await loadAppointment(id)
    const { writeBrief } = await import("@/lib/ai/agents/copilot")
    const brief = await writeBrief(appt)
    const supabase = await serverClient()
    await supabase.from("appointments").update({ brief }).eq("id", id)
    revalidatePath("/[locale]/admin", "layout")
    return brief
  })
}

/** Rough notes → summary, needs, next steps and a follow-up draft. Saves nothing. */
export async function summariseMeetingNotes(id: string, notes: string) {
  return attempt(async () => {
    const staff = await requireStaff()
    const text = z.string().trim().min(20, "Write or dictate a few lines first.").max(8000).parse(notes)
    const { aiConfigured } = await import("@/lib/ai/client")
    if (!aiConfigured) throw new Error("AI is not configured (ANTHROPIC_API_KEY).")
    const appt = await loadAppointment(id)
    const supabase = await serverClient()
    const [{ data: contact }, { data: agent }] = await Promise.all([
      appt.contact_id ? supabase.from("contacts").select("stage, budget_aed, interests").eq("id", appt.contact_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("agents").select("name").eq("slug", appt.agent_slug).maybeSingle(),
    ])
    const { summariseMeeting } = await import("@/lib/ai/agents/copilot")
    return summariseMeeting({ appt, notes: text, advisorName: agent?.name ?? staff.name, contact })
  })
}

const outcomeInput = z.object({
  summary: z.string().trim().min(1).max(4000),
  temperature: z.enum(["hot", "warm", "cold"]),
  needs: z.object({ budgetAed: z.number().nonnegative().nullable(), areas: z.array(z.string().max(120)).max(20), propertyTypes: z.array(z.string().max(60)).max(10), timing: z.string().max(200).nullable(), financing: z.string().max(200).nullable() }),
  nextSteps: z.array(z.object({ title: z.string().trim().min(1).max(300), dueInDays: z.number().int().min(0).max(60) })).max(5),
  stage: z.enum(STAGES).nullable(),
  followup: z.object({ subject: z.string().max(300), body: z.string().max(5000) }),
})

/** The advisor approved the summary: mark the meeting done and update the CRM. */
export async function saveMeetingOutcome(id: string, input: z.input<typeof outcomeInput>) {
  return attempt(async () => {
    const staff = await requireStaff()
    const o = outcomeInput.parse(input)
    const appt = await loadAppointment(id)
    const supabase = await serverClient()
    const { error } = await supabase
      .from("appointments")
      .update({ outcome: o, outcome_at: new Date().toISOString(), ...(appt.status === "confirmed" ? { status: "completed" } : {}) })
      .eq("id", id)
    if (error) throw new Error(error.message)

    if (appt.contact_id) {
      const cid = appt.contact_id
      await supabase.from("contact_activities").insert({ contact_id: cid, kind: "meeting", body: `${o.summary}\n\nTemperature: ${o.temperature}`, meta: { reference: appt.reference, outcome: true }, author: staff.id })
      if (o.nextSteps.length) {
        await supabase.from("contact_tasks").insert(
          o.nextSteps.map((n) => {
            const due = new Date(Date.now() + n.dueInDays * 86_400_000)
            due.setUTCHours(6, 0, 0, 0) // 10:00 in Dubai
            return { contact_id: cid, title: n.title, due_at: due.toISOString(), assignee: appt.agent_slug, created_by: staff.id }
          }),
        )
        await syncFollowUp(cid)
      }
      const { data: c } = await supabase.from("contacts").select("budget_aed, interests").eq("id", cid).single()
      await supabase
        .from("contacts")
        .update({
          last_activity_at: new Date().toISOString(),
          ...(o.stage ? { stage: o.stage } : {}),
          ...(o.needs.budgetAed && !c?.budget_aed ? { budget_aed: Math.round(o.needs.budgetAed) } : {}),
          interests: [...new Set([...(c?.interests ?? []), ...o.needs.areas, ...o.needs.propertyTypes])].slice(0, 30),
        })
        .eq("id", cid)
    }
    revalidatePath("/[locale]/admin", "layout")
  })
}

/* ── Advisor Score and reviews ─────────────────────────────────────────── */

export async function recomputeAdvisorScore(slug: string) {
  return attempt(async () => {
    await requireEditor()
    const { computeAdvisorScores } = await import("@/lib/ai/agents/advisor-score")
    await computeAdvisorScores(z.string().regex(/^[a-z0-9-]+$/).parse(slug))
    const { revalidateTag } = await import("next/cache")
    const { CONTENT_TAG } = await import("@/lib/supabase/config")
    revalidateTag(CONTENT_TAG)
    revalidatePath("/[locale]/admin/team", "layout")
  })
}

/** Approve (or hide) a verified review before it shows on the advisor's profile. */
export async function setReviewPublished(id: string, published: boolean) {
  return attempt(async () => {
    await requireStaff()
    const supabase = await serverClient()
    const { error } = await supabase.from("advisor_reviews").update({ published }).eq("id", z.string().uuid().parse(id))
    if (error) throw new Error(error.message)
    const { revalidateTag } = await import("next/cache")
    const { CONTENT_TAG } = await import("@/lib/supabase/config")
    revalidateTag(CONTENT_TAG)
    revalidatePath("/[locale]/admin", "layout")
  })
}

export async function deleteReview(id: string) {
  return attempt(async () => {
    const staff = await requireStaff()
    if (staff.role !== "admin") throw new Error("Only admins can delete reviews. Hide it instead.")
    const supabase = await serverClient()
    const { error } = await supabase.from("advisor_reviews").delete().eq("id", z.string().uuid().parse(id))
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin", "layout")
  })
}
