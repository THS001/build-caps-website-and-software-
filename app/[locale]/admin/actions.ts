"use server"

import { attempt, attemptForm, errorMessage } from "@/lib/action-result"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { after } from "next/server"
import type { QaTable } from "@/lib/ai/agents/translation-qa"
import type { Appointment } from "@/lib/booking/notify"
import { z } from "zod"
import { locales } from "@/i18n/locales"
import { CONTENT_TAG } from "@/lib/supabase/config"
import { currentStaff, serverClient } from "@/lib/supabase/server"

// Every write runs as the signed-in staff member, so RLS enforces their role.

export type FormState = { status: "idle" | "error" | "done"; message?: string; fieldErrors?: Record<string, string> }

const slug = z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only")
// An existing developer or project (their slugs may be two characters).
const refSlug = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/)
const optionalNumber = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional())
const optionalText = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional())

/** {"en": "...", "ar": "..."} from fields named `${name}.${locale}`; English is required. */
function localized(form: FormData, name: string) {
  const value: Record<string, string> = {}
  for (const l of locales) {
    const text = String(form.get(`${name}.${l}`) ?? "").trim()
    if (text) value[l] = text
  }
  return value
}

function fail(error: z.ZodError | string): FormState {
  if (typeof error === "string") return { status: "error", message: error }
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message
  return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
}

async function requireEditor() {
  const staff = await currentStaff()
  if (!staff || staff.role === "advisor") throw new Error("You don't have permission to edit content.")
  return staff
}

/* ── Properties ─────────────────────────────────────────────────────── */

const propertySchema = z
  .object({
    slug,
    title: z.object({ en: z.string().min(5, "English title is required") }).passthrough(),
    description: z.object({ en: z.string().min(20, "English description is required") }).passthrough(),
    status: z.enum(["offPlan", "ready"]),
    listing: z.enum(["sale", "rent"]),
    type: z.enum(["apartment", "villa", "townhouse", "penthouse", "duplex", "plot", "office", "retail"]),
    community_slug: z.string().min(1, "Choose a community"),
    developer_slug: optionalText,
    project_slug: optionalText,
    price_aed: optionalNumber,
    beds: z.coerce.number().int().min(0).max(20),
    baths: z.coerce.number().int().min(0).max(20),
    sqft: z.coerce.number().int().positive("Size is required"),
    handover: optionalText,
    est_yield: optionalNumber,
    service_charge_per_sqft: optionalNumber,
    furnishing: optionalText,
    lat: z.coerce.number().min(24).max(26.5),
    lng: z.coerce.number().min(54).max(56.5),
    permit: z.string().trim().min(3, "A DLD (Trakheesi) permit number is required by law"),
    permit_qr_url: optionalText,
    agent_slug: optionalText,
    badge: optionalText,
    featured: z.boolean(),
    published: z.boolean(),
    amenities: z.array(z.string()),
    keywords: z.array(z.string()),
    images: z.array(z.object({ src: z.string().url(), alt: z.object({ en: z.string() }).passthrough() })),
    payment_plan: z
      .object({ onBooking: z.number(), duringConstruction: z.number(), onHandover: z.number(), postHandover: z.number() })
      .nullable(),
  })
  .refine((p) => !(p.status === "offPlan" && p.listing === "rent"), { path: ["listing"], message: "Off-plan units can only be for sale" })
  .refine((p) => !(p.published && p.permit.startsWith("PENDING")), { path: ["permit"], message: "Add the real DLD permit before publishing" })
  .refine((p) => p.status === "offPlan" || !p.handover, { path: ["handover"], message: "Only off-plan units have a handover date" })
  .refine((p) => !p.payment_plan || Math.round(Object.values(p.payment_plan).reduce((a, b) => a + b, 0)) === 100, {
    path: ["payment_plan"],
    message: "The payment plan must add up to 100%",
  })

/** Translation QA checks published content in the background (it only flags). */
function checkTranslations(table: QaTable, key: string) {
  after(async () => {
    const { runTranslationQa } = await import("@/lib/ai/agents/translation-qa")
    await runTranslationQa(table, key)
  })
}

export async function saveProperty(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const plan = ["onBooking", "duringConstruction", "onHandover", "postHandover"].map((k) => Number(form.get(`plan.${k}`) || 0))
    const parsed = propertySchema.safeParse({
      slug: form.get("slug"),
      title: localized(form, "title"),
      description: localized(form, "description"),
      status: form.get("status"),
      listing: form.get("listing"),
      type: form.get("type"),
      community_slug: form.get("community_slug"),
      developer_slug: form.get("developer_slug"),
      project_slug: form.get("project_slug"),
      price_aed: form.get("price_aed"),
      beds: form.get("beds"),
      baths: form.get("baths"),
      sqft: form.get("sqft"),
      handover: form.get("handover"),
      est_yield: form.get("est_yield_pct") ? Number(form.get("est_yield_pct")) / 100 : undefined,
      service_charge_per_sqft: form.get("service_charge_per_sqft"),
      furnishing: form.get("furnishing"),
      lat: form.get("lat"),
      lng: form.get("lng"),
      permit: form.get("permit"),
      permit_qr_url: form.get("permit_qr_url"),
      agent_slug: form.get("agent_slug"),
      badge: form.get("badge"),
      featured: form.get("featured") === "on",
      published: form.get("published") === "on",
      amenities: form.getAll("amenities").map(String),
      keywords: form.getAll("keywords").map(String),
      images: JSON.parse(String(form.get("images") || "[]")),
      payment_plan: plan.some((v) => v > 0)
        ? { onBooking: plan[0], duringConstruction: plan[1], onHandover: plan[2], postHandover: plan[3] }
        : null,
    })
    if (!parsed.success) return fail(parsed.error)

    const supabase = await serverClient()
    const row = { ...parsed.data, handover: parsed.data.status === "offPlan" ? parsed.data.handover ?? null : null }
    const { data: saved, error } = id ? await supabase.from("properties").update(row).eq("id", id).select("id").single() : await supabase.from("properties").insert(row).select("id").single()
    if (error) return fail(error.code === "23505" ? "That URL slug is already used by another listing." : error.message)

    // Drive times and nearby schools, metro and parks for the lifestyle filters.
    after(async () => {
      const { refreshSurroundings } = await import("@/lib/geo/surroundings")
      await refreshSurroundings({ id: saved.id })
      revalidateTag(CONTENT_TAG)
    })
    if (row.published) checkTranslations("properties", saved.id)
    revalidateTag(CONTENT_TAG)
    redirect("/admin/properties")
  })
}

export async function setPropertyPublished(id: string, published: boolean) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    if (published) {
      const { data } = await supabase.from("properties").select("permit").eq("id", id).single()
      if (!data || data.permit.startsWith("PENDING")) throw new Error("Add the real DLD (Trakheesi) permit before publishing this listing.")
    }
    const { error } = await supabase.from("properties").update({ published }).eq("id", id)
    if (error) throw new Error(error.message)
    if (published) checkTranslations("properties", id)
    revalidateTag(CONTENT_TAG)
  })
}

export async function deleteProperty(id: string) {
  return attempt(async () => {
    const staff = await requireEditor()
    if (staff.role !== "admin") throw new Error("Only admins can delete listings. Unpublish it instead.")
    const supabase = await serverClient()
    const { error } = await supabase.from("properties").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

/* ── Funnels (Opportunities) ───────────────────────────────────────── */

const funnelSchema = z.object({
  slug,
  title: z.object({ en: z.string().min(3, "English title is required") }).passthrough(),
  pitch: z.object({ en: z.string().min(10, "English pitch is required") }).passthrough(),
  tag: z.object({ en: z.string().min(2, "English tag is required") }).passthrough(),
  key_number: z.object({ label: z.object({ en: z.string().min(1, "Label is required") }).passthrough(), value: z.string().min(1, "Value is required") }),
  external_url: z.string().url().startsWith("https://", "Use an https:// link"),
  image_url: optionalText,
  starts_at: z.string().min(10, "Start date is required"),
  ends_at: optionalText,
  locales: z.array(z.enum(locales)),
  sort_order: z.coerce.number().int().min(0).max(10_000),
  active: z.boolean(),
})

export async function saveFunnel(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = funnelSchema.safeParse({
      slug: form.get("slug"),
      title: localized(form, "title"),
      pitch: localized(form, "pitch"),
      tag: localized(form, "tag"),
      key_number: { label: localized(form, "keyLabel"), value: String(form.get("keyValue") ?? "").trim() },
      external_url: form.get("external_url"),
      image_url: form.get("image_url"),
      starts_at: form.get("starts_at"),
      ends_at: form.get("ends_at"),
      locales: form.getAll("locales").map(String),
      sort_order: form.get("sort_order") || 100,
      active: form.get("active") === "on",
    })
    if (!parsed.success) return fail(parsed.error)
    if (parsed.data.ends_at && parsed.data.ends_at < parsed.data.starts_at) return fail("The end date is before the start date.")

    const supabase = await serverClient()
    // No languages ticked means every language.
    const row = { ...parsed.data, ends_at: parsed.data.ends_at ?? null, locales: parsed.data.locales.length ? parsed.data.locales : null }
    const { data: saved, error } = id ? await supabase.from("funnels").update(row).eq("id", id).select("id").single() : await supabase.from("funnels").insert(row).select("id").single()
    if (error) return fail(error.code === "23505" ? "That slug is already used by another opportunity." : error.message)
    if (row.active) checkTranslations("funnels", saved.id)

    revalidateTag(CONTENT_TAG)
    redirect("/admin/funnels")
  })
}

export async function deleteFunnel(id: string) {
  return attempt(async () => {
    const staff = await requireEditor()
    if (staff.role !== "admin") throw new Error("Only admins can delete opportunities. Deactivate it instead.")
    const supabase = await serverClient()
    const { error } = await supabase.from("funnels").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

/* ── Leads ──────────────────────────────────────────────────────────── */

/* ── Appointments ───────────────────────────────────────────────────── */

async function lifecycle() {
  const notify = await import("@/lib/booking/notify")
  const { bookableAdvisors } = await import("@/lib/booking/availability")
  const advisors = await bookableAdvisors()
  const advisorFor = (slug: string) => advisors.find((a) => a.slug === slug) ?? { slug, name: "Buildcaps", email: null, meetingUrl: null }
  return { ...notify, advisors, advisorFor }
}

export async function setAppointmentStatus(id: string, status: "completed" | "no_show" | "cancelled") {
  return attempt(async () => {
    const staff = await currentStaff()
    if (!staff) throw new Error("Not signed in.")
    const supabase = await serverClient()
    const { data, error } = await supabase.from("appointments").update({ status }).eq("id", id).select("*").single()
    if (error) throw new Error(error.message)

    const { emailVisitor, advisorFor } = await lifecycle()
    if (status === "no_show") await emailVisitor("noShow", data, advisorFor(data.agent_slug))
    if (status === "cancelled") await emailVisitor("cancelled", data, advisorFor(data.agent_slug))
  })
}

export async function reassignAppointment(id: string, agentSlug: string) {
  return attempt(async () => {
    const staff = await currentStaff()
    if (!staff || staff.role === "advisor") throw new Error("You don't have permission to reassign bookings.")
    const supabase = await serverClient()
    const { data: before, error: readError } = await supabase.from("appointments").select("*").eq("id", id).single()
    if (readError) throw new Error(readError.message)

    const { emailTeam, emailVisitor, syncMeetingLink, advisors } = await lifecycle()
    const next = advisors.find((a) => a.slug === agentSlug)
    if (!next) throw new Error("Unknown advisor.")

    // Same time, new advisor: the database refuses it if they're busy or off then.
    const { data: moved, error: moveError } = await supabase.rpc("staff_reschedule_appointment", { p_id: id, p_start: before.starts_at, p_end: before.ends_at, p_agent: agentSlug })
    if (moveError) throw new Error(/slot_taken/.test(moveError.message) ? `${next.name} is busy or off at that time.` : moveError.message)
    // A video call moves to the new advisor's meeting room, and the visitor gets the new link.
    const { appointment, changed } = await syncMeetingLink(moved as Appointment, next)
    if (changed) await emailVisitor("rescheduled", appointment, next)
    await emailTeam("moved", appointment, next)
  })
}

/* ── Posts (Insights) ───────────────────────────────────────────────── */

const postSchema = z.object({
  slug,
  title: z.object({ en: z.string().min(5, "English title is required") }).passthrough(),
  excerpt: z.object({ en: z.string().min(10, "English excerpt is required") }).passthrough(),
  body: z.object({ en: z.string().min(50, "English article text is required") }).passthrough(),
  category: z.enum(["market", "guides", "offPlan", "communities", "news"]),
  author: z.string().trim().min(2).max(80),
  minutes: z.coerce.number().int().min(1).max(60),
  cover_url: optionalText,
  published: z.boolean(),
})

export async function savePost(originalSlug: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = postSchema.safeParse({
      slug: form.get("slug"),
      title: localized(form, "title"),
      excerpt: localized(form, "excerpt"),
      body: localized(form, "body"),
      category: form.get("category"),
      author: form.get("author"),
      minutes: form.get("minutes"),
      cover_url: form.get("cover_url"),
      published: form.get("published") === "on",
    })
    if (!parsed.success) return fail(parsed.error)
    // Articles are stored as one localised block; paragraphs are split on blank lines when shown.
    const row = { ...parsed.data, body: [parsed.data.body] }
    const supabase = await serverClient()
    const { error } = originalSlug ? await supabase.from("posts").update(row).eq("slug", originalSlug) : await supabase.from("posts").insert(row)
    if (error) return fail(error.code === "23505" ? "That slug is already used by another article." : error.message)
    if (row.published) checkTranslations("posts", row.slug)
    revalidateTag(CONTENT_TAG)
    redirect("/admin/posts")
  })
}

/* ── Market data ────────────────────────────────────────────────────── */

/** A file the browser uploaded to the private bucket for an import (see components/admin/private-upload.ts). */
async function takeImport(path: string, folder: "brochures" | "dld") {
  if (!new RegExp(`^imports/${folder}/[a-z0-9.-]+$`).test(path)) throw new Error("Upload the file again.")
  const { adminClient } = await import("@/lib/supabase/admin")
  const bucket = adminClient().storage.from("documents")
  const { data, error } = await bucket.download(path)
  if (error || !data) throw new Error("The uploaded file couldn't be read. Upload it again.")
  return { file: data, discard: () => bucket.remove([path]).then(() => undefined) }
}

export async function importDldCsv(path: string): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    let upload: Awaited<ReturnType<typeof takeImport>> | undefined
    try {
      upload = await takeImport(path, "dld")
      const { ingestDld, refreshCommunityStats, streamText } = await import("@/lib/market/dld")
      const stats = await ingestDld(streamText(upload.file.stream()))
      const updated = await refreshCommunityStats()
      revalidateTag(CONTENT_TAG)
      return { status: "done", message: `Imported ${stats.inserted} new sales (${stats.kept} kept of ${stats.read} rows), ${stats.months} monthly medians. ${updated.length} communities refreshed.` }
    } catch (error) {
      return fail(errorMessage(error, "Import failed."))
    } finally {
      await upload?.discard()
    }
  })
}

export async function runMarketIntelNow() {
  return attempt(async () => {
    await requireEditor()
    const { runMarketIntel } = await import("@/lib/ai/agents/market-intel")
    const report = await runMarketIntel("admin")
    revalidateTag(CONTENT_TAG)
    return JSON.stringify(report)
  })
}

export async function saveCommunityMarket(slugValue: string, dldAreas: string, estYieldPct: string) {
  return attempt(async () => {
    await requireEditor()
    const areas = dldAreas
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
    const yieldValue = Number(estYieldPct)
    const supabase = await serverClient()
    const { error } = await supabase
      .from("communities")
      .update({ dld_areas: areas, ...(Number.isFinite(yieldValue) && yieldValue > 0 ? { est_yield: yieldValue / 100 } : {}) })
      .eq("slug", slugValue)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

/* ── Lead follow-ups (Lead Nurture drafts) ──────────────────────────── */

export async function sendFollowup(id: string, subject: string, body: string) {
  return attempt(async () => {
    const staff = await currentStaff()
    if (!staff) throw new Error("Not signed in.")
    const supabase = await serverClient()
    const { data: draft, error } = await supabase.from("lead_followups").select("id, lead_id, leads(email, locale, contact_id)").eq("id", id).single()
    if (error || !draft) throw new Error(error?.message ?? "Draft not found.")
    const lead = draft.leads as unknown as { email: string; locale: string | null; contact_id: string | null }
    const { renderEmail } = await import("@/lib/email/templates")
    const { sendEmail } = await import("@/lib/email/send")
    const locale = (locales as readonly string[]).includes(lead.locale ?? "") ? (lead.locale as (typeof locales)[number]) : "en"
    const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const { html, text } = await renderEmail({ locale, preheader: paragraphs[0] ?? subject, heading: subject, paragraphs })
    if (!(await sendEmail({ to: lead.email, subject, html, text, replyTo: staff.email }))) throw new Error("The email could not be sent. Check the email settings.")
    await supabase.from("lead_followups").update({ status: "sent", sent_at: new Date().toISOString(), subject, body }).eq("id", id)
    await supabase.from("leads").update({ status: "contacted" }).eq("id", draft.lead_id)
    // On the CRM timeline, and a new contact moves to "contacted".
    if (lead.contact_id) {
      await supabase.from("contact_activities").insert({ contact_id: lead.contact_id, kind: "email", body: [subject, body].join("\n\n"), author: staff.id })
      const { data: c } = await supabase.from("contacts").select("stage").eq("id", lead.contact_id).single()
      await supabase.from("contacts").update({ last_activity_at: new Date().toISOString(), ...(c?.stage === "new" ? { stage: "contacted" } : {}) }).eq("id", lead.contact_id)
    }
  })
}

export async function discardFollowup(id: string) {
  return attempt(async () => {
    const staff = await currentStaff()
    if (!staff) throw new Error("Not signed in.")
    const supabase = await serverClient()
    await supabase.from("lead_followups").update({ status: "discarded" }).eq("id", id)
  })
}

/* ── AI helpers ─────────────────────────────────────────────────────── */

// The model reads PDFs of up to 32 MB per request; base64 adds a third.
const BROCHURE_MAX_BYTES = 20 * 1024 * 1024

/** Listing Ops: brochure PDF (already uploaded) → draft listing in 10 languages (unpublished). */
export async function importBrochure(path: string, note: string): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const [{ data: communities }, { data: developers }] = await Promise.all([
      supabase.from("communities").select("slug, name"),
      supabase.from("developers").select("slug, name"),
    ])
    let id: string
    let upload: Awaited<ReturnType<typeof takeImport>> | undefined
    try {
      upload = await takeImport(path, "brochures")
      if (upload.file.size > BROCHURE_MAX_BYTES) return fail("The PDF must be 20 MB or smaller.")
      const { draftListingFromBrochure } = await import("@/lib/ai/agents/listing-ops")
      const result = await draftListingFromBrochure(Buffer.from(await upload.file.arrayBuffer()).toString("base64"), {
        communities: communities ?? [],
        developers: developers ?? [],
        note: note.slice(0, 500),
      })
      id = result.id
    } catch (error) {
      return fail(errorMessage(error, "Import failed."))
    } finally {
      await upload?.discard()
    }
    revalidateTag(CONTENT_TAG)
    redirect(`/admin/properties/${id}`)
  })
}

/** Verified Listing: run the AI photo check (result saved on the listing). */
export async function runPhotoCheck(id: string) {
  return attempt(async () => {
    await requireEditor()
    try {
      const { verifyListing } = await import("@/lib/ai/agents/verify-listing")
      const result = await verifyListing(id)
      return { ok: true, message: `${result.verdict.toUpperCase()}${result.issues.length ? `: ${result.issues.join("; ")}` : ""}` }
    } catch (error) {
      return { ok: false, message: errorMessage(error, "Check failed.") }
    }
  })
}

/** An advisor confirms the listing after reviewing the check: the "Verified" badge appears. */
export async function confirmVerified(id: string, verified: boolean) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("properties").update({ verified_at: verified ? new Date().toISOString() : null }).eq("id", id)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

/** Drafts translations of one English text into the given languages (empty fields only). */
export async function translateText(text: string, targets: string[]): Promise<{ values: Record<string, string>; warnings: string[]; error?: string }> {
  const staff = await currentStaff()
  if (!staff) return { values: {}, warnings: [], error: "Not signed in." }
  const english = z.string().trim().min(1).max(6000).safeParse(text)
  if (!english.success) return { values: {}, warnings: [], error: "Write the English text first." }
  const wanted = targets.filter((t): t is (typeof locales)[number] => (locales as readonly string[]).includes(t) && t !== "en")
  if (!wanted.length) return { values: {}, warnings: [] }
  try {
    const { translateFields } = await import("@/lib/ai/agents/translate")
    const result = await translateFields({ text: english.data }, wanted)
    return {
      values: Object.fromEntries(Object.entries(result.values).map(([l, v]) => [l, v?.text ?? ""])),
      warnings: result.warnings,
    }
  } catch (error) {
    return { values: {}, warnings: [], error: errorMessage(error, "Translation failed.") }
  }
}

/* ── Session ────────────────────────────────────────────────────────── */

export async function signOut() {
  const supabase = await serverClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}

/* ── SEO Growth Agent ──────────────────────────────────────────────────── */

async function requireAdmin() {
  const staff = await currentStaff()
  if (!staff || staff.role !== "admin") throw new Error("Only admins can publish SEO changes.")
  return staff
}

export async function runSeoNow(mode: "dry_run" | "live") {
  return attempt(async () => {
    await requireAdmin()
    const { runSeoAgent } = await import("@/lib/seo-agent/run")
    const result = await runSeoAgent({ mode, trigger: "admin" })
    return "summary" in result ? result.summary : result.reason
  })
}

export async function approveSeoProposal(id: string) {
  return attempt(async () => {
    const staff = await requireAdmin()
    const { adminClient } = await import("@/lib/supabase/admin")
    const { applyProposal } = await import("@/lib/seo-agent/apply")
    const { data } = await adminClient().from("seo_proposals").select("*").eq("id", id).eq("status", "proposed").single()
    if (!data) throw new Error("This proposal is no longer waiting for approval.")
    await applyProposal(data, staff.id)
  })
}

export async function rejectSeoProposal(id: string) {
  return attempt(async () => {
    const staff = await requireAdmin()
    const { adminClient } = await import("@/lib/supabase/admin")
    await adminClient().from("seo_proposals").update({ status: "rejected", decided_by: staff.id }).eq("id", id).eq("status", "proposed")
  })
}

export async function rollbackSeoProposal(id: string) {
  return attempt(async () => {
    await requireAdmin()
    const { rollbackProposal } = await import("@/lib/seo-agent/apply")
    await rollbackProposal(id, { note: "Rolled back by an admin" })
  })
}

/* ── Track record: developer promises and construction progress ────────── */

const promiseSchema = z.object({
  developer_slug: refSlug,
  project_slug: optionalText,
  category: z.enum(["handover", "amenity", "specification", "payment", "community", "other"]),
  promise: z.string().trim().min(3).max(500),
  source: optionalText,
  due: optionalText,
  status: z.enum(["pending", "delivered", "partly", "broken"]),
  evidence: optionalText,
  evidence_url: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  published: z.preprocess((v) => v === "on", z.boolean()),
})

export async function savePromise(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = promiseSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const { promise, ...rest } = parsed.data
    const supabase = await serverClient()
    const { error } = await supabase.from("developer_promises").insert({ ...rest, promise: { en: promise } })
    if (error) return fail(error.message)
    revalidateTag(CONTENT_TAG)
    return { status: "done", message: "Promise added." }
  })
}

export async function updatePromise(id: string, patch: { status?: "pending" | "delivered" | "partly" | "broken"; published?: boolean; evidence?: string; evidence_url?: string }) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("developer_promises").update(patch).eq("id", id)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

export async function deletePromise(id: string) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("developer_promises").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}

const progressSchema = z.object({
  project_slug: refSlug,
  recorded_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  progress: z.coerce.number().min(0).max(100),
  source: z.enum(["rera", "site_visit", "developer", "satellite"]),
  note: optionalText,
})

/** Records a progress reading and updates the project's current progress. */
export async function addProgress(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = progressSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(parsed.error)
    const d = parsed.data
    const supabase = await serverClient()
    const { error } = await supabase.from("project_progress").upsert({ ...d, progress: d.progress / 100 }, { onConflict: "project_slug,recorded_on,source" })
    if (error) return fail(error.message)
    const { data: latest } = await supabase.from("project_progress").select("progress").eq("project_slug", d.project_slug).order("recorded_on", { ascending: false }).limit(1).single()
    if (latest) await supabase.from("projects").update({ construction_progress: latest.progress }).eq("slug", d.project_slug)
    revalidateTag(CONTENT_TAG)
    return { status: "done", message: "Progress recorded." }
  })
}

export async function saveProjectFacts(projectSlug: string, facts: { floors: number | null; launched_on: string | null; escrow_registered: boolean }) {
  return attempt(async () => {
    await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("projects").update(facts).eq("slug", projectSlug)
    if (error) throw new Error(error.message)
    revalidateTag(CONTENT_TAG)
  })
}
