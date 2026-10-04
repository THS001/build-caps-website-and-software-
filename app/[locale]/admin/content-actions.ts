"use server"

import { attempt, attemptForm } from "@/lib/action-result"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { z } from "zod"
import { locales } from "@/i18n/locales"
import { CONTENT_TAG } from "@/lib/supabase/config"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import type { FormState } from "./actions"

// Communities, developers, off-plan projects, market reports and careers.
// Writes run as the signed-in staff member, so RLS enforces editor rights.

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only")
const num = (min: number, max: number) => z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().min(min).max(max).nullable())
const pct = z.preprocess((v) => (v === "" || v === null ? null : Number(v) / 100), z.number().min(0).max(1).nullable())
const text = (max: number) => z.preprocess((v) => (v === "" || v === null ? null : v), z.string().trim().max(max).nullable())

async function requireEditor() {
  const staff = await currentStaff()
  if (!staff || staff.role === "advisor") throw new Error("You don't have permission to edit content.")
  return staff
}

/** {"en": "...", "ar": "..."} from fields named `${name}.${locale}`. */
function localized(form: FormData, name: string) {
  const value: Record<string, string> = {}
  for (const l of locales) {
    const t = String(form.get(`${name}.${l}`) ?? "").trim()
    if (t) value[l] = t
  }
  return value
}
const localizedSchema = (required = true) => z.record(z.string()).refine((v) => !required || Boolean(v.en), { message: "English is required", path: ["en"] })

function fail(error: z.ZodError | string): FormState {
  if (typeof error === "string") return { status: "error", message: error }
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message
  return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
}

async function save(table: string, key: string | null, row: Record<string, unknown>, back: string): Promise<FormState> {
  const supabase = await serverClient()
  const { error } = key ? await supabase.from(table).update(row).eq("slug", key) : await supabase.from(table).insert(row)
  if (error) return fail(error.code === "23505" ? "That URL slug is already used." : error.code === "23503" ? "Pick an existing community and developer." : error.message)
  // Translation QA checks published content in the background (it only flags).
  if (row.published) {
    after(async () => {
      const { runTranslationQa } = await import("@/lib/ai/agents/translation-qa")
      await runTranslationQa(table as "communities" | "developers" | "projects" | "reports" | "jobs", String(row.slug))
    })
  }
  revalidateTag(CONTENT_TAG)
  redirect(back)
}

/** Admins only; anything still referenced (listings, projects) blocks the delete. */
export async function deleteContent(table: "communities" | "developers" | "projects" | "reports" | "jobs", key: string) {
  return attempt(async () => {
    const staff = await requireEditor()
    if (staff.role !== "admin") throw new Error("Only admins can delete. Unpublish it instead.")
    const supabase = await serverClient()
    const { error } = await supabase.from(table).delete().eq("slug", key)
    if (error) throw new Error(error.code === "23503" ? "Still used by listings or projects. Move or delete those first, or unpublish this instead." : error.message)
    revalidateTag(CONTENT_TAG)
  })
}

/** Coordinates for a place in the UAE (OpenStreetMap Nominatim, free). */
export async function geocode(query: string) {
  return attempt(async () => {
    await requireEditor()
    const q = z.string().trim().min(2).max(160).safeParse(query)
    if (!q.success) return null
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ae&q=${encodeURIComponent(q.data)}`
    try {
      const res = await fetch(url, { headers: { "user-agent": "Buildcaps admin (buildcaps.com)" }, signal: AbortSignal.timeout(8000), cache: "no-store" })
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[]
      return hit ? { lat: Math.round(Number(hit.lat) * 1e5) / 1e5, lng: Math.round(Number(hit.lon) * 1e5) / 1e5, label: hit.display_name } : null
    } catch {
      return null
    }
  })
}

/* ── Communities ──────────────────────────────────────────────────────── */

export async function saveCommunity(key: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = z
      .object({
        slug,
        name: z.string().trim().min(2).max(120),
        summary: localizedSchema(),
        lifestyle: localizedSchema(false),
        schools: localizedSchema(false),
        transport: localizedSchema(false),
        avg_price_per_sqft: num(0, 100_000),
        est_yield: pct,
        price_change_12m: z.preprocess((v) => (v === "" || v === null ? null : Number(v) / 100), z.number().min(-1).max(5).nullable()),
        lat: z.coerce.number().min(22).max(27),
        lng: z.coerce.number().min(51).max(57),
        waterfront: z.boolean(),
        dld_areas: z.array(z.string().trim().min(1).max(120)).max(20),
        published: z.boolean(),
      })
      .safeParse({
        slug: form.get("slug"),
        name: form.get("name"),
        summary: localized(form, "summary"),
        lifestyle: localized(form, "lifestyle"),
        schools: localized(form, "schools"),
        transport: localized(form, "transport"),
        avg_price_per_sqft: form.get("avg_price_per_sqft"),
        est_yield: form.get("est_yield"),
        price_change_12m: form.get("price_change_12m"),
        lat: form.get("lat"),
        lng: form.get("lng"),
        waterfront: form.get("waterfront") === "on",
        dld_areas: String(form.get("dld_areas") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        published: form.get("published") === "on",
      })
    if (!parsed.success) return fail(parsed.error)
    const d = parsed.data
    return save("communities", key, { ...d, lifestyle: d.lifestyle.en ? d.lifestyle : { en: "" }, schools: d.schools.en ? d.schools : { en: "" }, transport: d.transport.en ? d.transport : { en: "" } }, "/admin/communities")
  })
}

/* ── Developers ───────────────────────────────────────────────────────── */

export async function saveDeveloper(key: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = z
      .object({
        slug,
        name: z.string().trim().min(2).max(120),
        founded: num(1900, 2100),
        summary: localizedSchema(),
        logo_url: text(1000),
        delivered_projects: num(0, 10_000),
        on_time_rate: pct,
        promises_kept: pct,
        published: z.boolean(),
      })
      .safeParse({
        slug: form.get("slug"),
        name: form.get("name"),
        founded: form.get("founded"),
        summary: localized(form, "summary"),
        logo_url: form.get("logo_url"),
        delivered_projects: form.get("delivered_projects"),
        on_time_rate: form.get("on_time_rate"),
        promises_kept: form.get("promises_kept"),
        published: form.get("published") === "on",
      })
    if (!parsed.success) return fail(parsed.error)
    return save("developers", key, parsed.data, "/admin/developers")
  })
}

/* ── Off-plan projects ────────────────────────────────────────────────── */

export async function saveProject(key: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const plan = {
      onBooking: Number(form.get("plan.onBooking") || 0),
      duringConstruction: Number(form.get("plan.duringConstruction") || 0),
      onHandover: Number(form.get("plan.onHandover") || 0),
      postHandover: Number(form.get("plan.postHandover") || 0),
    }
    const parsed = z
      .object({
        slug,
        name: z.string().trim().min(2).max(120),
        developer_slug: slug,
        community_slug: slug,
        summary: localizedSchema(),
        launch_price_aed: num(1, 1e10),
        handover: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a handover date"),
        launched_on: text(10),
        payment_plan: z
          .object({ onBooking: z.number().min(0).max(100), duringConstruction: z.number().min(0).max(100), onHandover: z.number().min(0).max(100), postHandover: z.number().min(0).max(100) })
          .refine((p) => Math.round(p.onBooking + p.duringConstruction + p.onHandover + p.postHandover) === 100, { message: "The payment plan must add up to 100%" }),
        unit_types: text(200),
        construction_progress: z.preprocess((v) => Number(v || 0) / 100, z.number().min(0).max(1)),
        escrow_registered: z.boolean(),
        floors: num(1, 250),
        lat: z.coerce.number().min(22).max(27),
        lng: z.coerce.number().min(51).max(57),
        published: z.boolean(),
      })
      .safeParse({
        slug: form.get("slug"),
        name: form.get("name"),
        developer_slug: form.get("developer_slug"),
        community_slug: form.get("community_slug"),
        summary: localized(form, "summary"),
        launch_price_aed: form.get("launch_price_aed"),
        handover: form.get("handover"),
        launched_on: form.get("launched_on"),
        payment_plan: plan,
        unit_types: form.get("unit_types"),
        construction_progress: form.get("construction_progress"),
        escrow_registered: form.get("escrow_registered") === "on",
        floors: form.get("floors"),
        lat: form.get("lat"),
        lng: form.get("lng"),
        published: form.get("published") === "on",
      })
    if (!parsed.success) return fail(parsed.error)
    return save("projects", key, parsed.data, "/admin/projects")
  })
}

/* ── Market reports and the investor guide ────────────────────────────── */

export async function saveReport(key: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    const parsed = z
      .object({
        slug,
        kind: z.enum(["report", "guide"]),
        title: localizedSchema(),
        quarter: z.string().trim().min(2).max(40),
        summary: localizedSchema(),
        file_path: text(500),
        published: z.boolean(),
      })
      .safeParse({
        slug: form.get("slug"),
        kind: form.get("kind"),
        title: localized(form, "title"),
        quarter: form.get("quarter"),
        summary: localized(form, "summary"),
        file_path: form.get("file_path"),
        published: form.get("published") === "on",
      })
    if (!parsed.success) return fail(parsed.error)
    if (parsed.data.published && !parsed.data.file_path) return fail("Upload the PDF before publishing, so people who ask for it receive it.")
    return save("reports", key, parsed.data, "/admin/reports")
  })
}

/* ── Careers ──────────────────────────────────────────────────────────── */

export async function saveJob(key: string | null, _: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireEditor()
    // One requirement per line; other languages line up with the English lines.
    const reqText = localized(form, "requirements")
    const lines = Object.fromEntries(Object.entries(reqText).map(([l, t]) => [l, t.split("\n").map((s) => s.trim()).filter(Boolean)]))
    const requirements = (lines.en ?? []).map((en, i) => Object.fromEntries([["en", en], ...Object.entries(lines).filter(([l]) => l !== "en" && lines[l][i]).map(([l]) => [l, lines[l][i]])]))
    const parsed = z
      .object({
        slug,
        title: localizedSchema(),
        location: z.string().trim().min(2).max(80),
        type: localizedSchema(),
        summary: localizedSchema(),
        published: z.boolean(),
      })
      .safeParse({
        slug: form.get("slug"),
        title: localized(form, "title"),
        location: form.get("location") || "Dubai",
        type: localized(form, "type"),
        summary: localized(form, "summary"),
        published: form.get("published") === "on",
      })
    if (!parsed.success) return fail(parsed.error)
    return save("jobs", key, { ...parsed.data, requirements }, "/admin/jobs")
  })
}
