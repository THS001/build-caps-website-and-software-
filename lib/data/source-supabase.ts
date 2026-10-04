import "server-only"
// Supabase source: same functions as source-mock.ts, reading published rows through RLS.

import type { Locale } from "@/i18n/locales"
import { publicClient } from "@/lib/supabase/public"
import { companyStats } from "./mock"
import { GOLDEN_VISA_THRESHOLD } from "./shared"
import { hasLifestyleFilter, matchesLifestyle } from "@/lib/search/lifestyle"
import type { AdvisorReview, Agent, Community, Developer, DeveloperPromise, Funnel, Job, Localized, Post, PostCategory, ProgressPoint, Project, Property, PropertyFilters, Report } from "./types"

type Row = Record<string, unknown>

const L = (v: unknown): Localized => (v && typeof v === "object" && "en" in v ? (v as Localized) : { en: String(v ?? "") })
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))

function toProperty(r: Row): Property {
  return {
    slug: r.slug as string,
    title: L(r.title),
    description: L(r.description),
    status: r.status as Property["status"],
    listing: r.listing as Property["listing"],
    type: r.type as Property["type"],
    communitySlug: r.community_slug as string,
    developerSlug: (r.developer_slug as string) ?? "",
    projectSlug: (r.project_slug as string) ?? undefined,
    priceAed: n(r.price_aed),
    beds: Number(r.beds),
    baths: Number(r.baths),
    sqft: Number(r.sqft),
    handover: (r.handover as string) ?? null,
    paymentPlan: (r.payment_plan as Property["paymentPlan"]) ?? undefined,
    estYield: n(r.est_yield) ?? undefined,
    serviceChargePerSqft: n(r.service_charge_per_sqft) ?? undefined,
    furnishing: (r.furnishing as Property["furnishing"]) ?? undefined,
    amenities: (r.amenities as string[]) ?? [],
    images: ((r.images as { src: string; alt: unknown }[]) ?? []).map((i) => ({ src: i.src, alt: L(i.alt) })),
    geo: { lat: Number(r.lat), lng: Number(r.lng) },
    permit: r.permit as string,
    agentSlug: (r.agent_slug as string) ?? "",
    featured: Boolean(r.featured),
    badge: (r.badge as Property["badge"]) ?? undefined,
    keywords: (r.keywords as string[]) ?? [],
    publishedAt: String(r.published_at ?? r.created_at ?? "").slice(0, 10),
    verifiedAt: (r.verified_at as string) ?? null,
    surroundings: (r.surroundings as Property["surroundings"]) ?? null,
  }
}

const toCommunity = (r: Row): Community => ({
  slug: r.slug as string,
  name: r.name as string,
  summary: L(r.summary),
  lifestyle: L(r.lifestyle),
  schools: L(r.schools),
  transport: L(r.transport),
  avgPricePerSqft: Number(r.avg_price_per_sqft ?? 0),
  estYield: Number(r.est_yield ?? 0),
  priceChange12m: Number(r.price_change_12m ?? 0),
  geo: { lat: Number(r.lat), lng: Number(r.lng) },
  waterfront: Boolean(r.waterfront),
  dldAreas: (r.dld_areas as string[]) ?? [],
})

const toDeveloper = (r: Row): Developer => ({
  slug: r.slug as string,
  name: r.name as string,
  founded: (r.founded as number) ?? undefined,
  summary: L(r.summary),
  deliveredProjects: n(r.delivered_projects),
  onTimeRate: n(r.on_time_rate),
  promisesKept: n(r.promises_kept),
})

const toProject = (r: Row): Project => ({
  slug: r.slug as string,
  name: r.name as string,
  developerSlug: r.developer_slug as string,
  communitySlug: r.community_slug as string,
  summary: L(r.summary),
  launchPriceAed: Number(r.launch_price_aed ?? 0),
  handover: r.handover as string,
  paymentPlan: r.payment_plan as Project["paymentPlan"],
  unitTypes: (r.unit_types as string) ?? "",
  constructionProgress: Number(r.construction_progress ?? 0),
  escrowRegistered: Boolean(r.escrow_registered),
  geo: { lat: Number(r.lat), lng: Number(r.lng) },
  floors: n(r.floors),
  launchedOn: (r.launched_on as string) ?? null,
})

const toFunnel = (r: Row): Funnel => {
  const key = (r.key_number as { label?: unknown; value?: string }) ?? {}
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: L(r.title),
    pitch: L(r.pitch),
    keyNumber: { label: L(key.label), value: key.value ?? "" },
    tag: L(r.tag),
    externalUrl: r.external_url as string,
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string) ?? null,
    locales: (r.locales as Locale[]) ?? "all",
    sortOrder: Number(r.sort_order ?? 100),
    imageUrl: (r.image_url as string) ?? null,
  }
}

const toAgent = (r: Row): Agent => ({
  slug: r.slug as string,
  name: r.name as string,
  role: r.role as Agent["role"],
  languages: (r.languages as Locale[]) ?? ["en"],
  specialties: (r.specialties as string[]) ?? [],
  bio: L(r.bio),
  brn: (r.brn as string) ?? null,
  photo: (r.photo_url as string) ?? undefined,
  respondsWithin: (r.responds_within as string) ?? "1h",
  score: (r.score as Agent["score"]) ?? null,
})

const toPost = (r: Row): Post => ({
  slug: r.slug as string,
  title: L(r.title),
  excerpt: L(r.excerpt),
  body: ((r.body as unknown[]) ?? []).map(L),
  category: r.category as PostCategory,
  author: (r.author as string) ?? "",
  publishedAt: String(r.published_at ?? "").slice(0, 10),
  minutes: Number(r.minutes ?? 5),
  coverUrl: (r.cover_url as string) ?? null,
})

const toReport = (r: Row): Report => ({ slug: r.slug as string, title: L(r.title), quarter: r.quarter as string, summary: L(r.summary) })

const toJob = (r: Row): Job => ({
  slug: r.slug as string,
  title: L(r.title),
  location: (r.location as string) ?? "Dubai",
  type: L(r.type),
  summary: L(r.summary),
  requirements: ((r.requirements as unknown[]) ?? []).map(L),
})

function rows<T>(result: { data: Row[] | null; error: { message: string } | null }, map: (r: Row) => T) {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`)
  return (result.data ?? []).map(map)
}

function one<T>(result: { data: Row | null; error: { message: string } | null }, map: (r: Row) => T) {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`)
  return result.data ? map(result.data) : null
}

export async function getProperties(filters: PropertyFilters = {}) {
  let query = publicClient().from("properties").select("*").eq("published", true)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.type) query = query.eq("type", filters.type)
  if (filters.community) query = query.eq("community_slug", filters.community)
  if (filters.developer) query = query.eq("developer_slug", filters.developer)
  if (filters.minBeds !== undefined) query = query.gte("beds", filters.minBeds)
  if (filters.minPrice !== undefined) query = query.gte("price_aed", filters.minPrice)
  if (filters.maxPrice !== undefined) query = query.lte("price_aed", filters.maxPrice)
  if (filters.handoverYear) query = query.gte("handover", `${filters.handoverYear}-01-01`).lte("handover", `${filters.handoverYear}-12-31`)
  if (filters.goldenVisa) query = query.gte("price_aed", GOLDEN_VISA_THRESHOLD)
  if (filters.postHandover) query = query.gt("payment_plan->postHandover", 0)

  switch (filters.sort ?? "featured") {
    case "priceAsc":
      query = query.order("price_aed", { ascending: true, nullsFirst: false })
      break
    case "priceDesc":
      query = query.order("price_aed", { ascending: false, nullsFirst: false })
      break
    case "yieldDesc":
      query = query.order("est_yield", { ascending: false, nullsFirst: false })
      break
    case "handoverAsc":
      query = query.order("handover", { ascending: true, nullsFirst: true })
      break
    case "newest":
      query = query.order("published_at", { ascending: false })
      break
    default:
      query = query.order("featured", { ascending: false }).order("published_at", { ascending: false })
  }

  let list = rows(await query, toProperty)
  if (hasLifestyleFilter(filters)) list = list.filter((p) => matchesLifestyle(p, filters))
  if (filters.q) {
    const words = filters.q.toLowerCase().split(/\s+/)
    list = list.filter((p) => {
      const haystack = [p.title.en, p.description.en, p.communitySlug, p.type, ...p.keywords].join(" ").toLowerCase()
      return words.every((w) => haystack.includes(w))
    })
  }
  return list
}

export async function getProperty(slug: string) {
  return one(await publicClient().from("properties").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toProperty)
}

export async function getFeaturedProperties(limit = 6) {
  return rows(
    await publicClient().from("properties").select("*").eq("published", true).eq("featured", true).order("published_at", { ascending: false }).limit(limit),
    toProperty,
  )
}

export async function getSimilarProperties(property: Property, limit = 3) {
  const candidates = rows(
    await publicClient()
      .from("properties")
      .select("*")
      .eq("published", true)
      .neq("slug", property.slug)
      .or(`community_slug.eq.${property.communitySlug},type.eq.${property.type},status.eq.${property.status}`)
      .limit(30),
    toProperty,
  )
  const price = property.priceAed ?? 1
  return candidates
    .map((p) => ({
      p,
      score:
        Number(p.communitySlug === property.communitySlug) * 3 +
        Number(p.type === property.type) * 2 +
        Number(p.status === property.status) +
        (1 - Math.min(1, Math.abs((p.priceAed ?? 0) - price) / price)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}

export async function getCommunities() {
  return rows(await publicClient().from("communities").select("*").eq("published", true).order("name"), toCommunity)
}

export async function getCommunity(slug: string) {
  return one(await publicClient().from("communities").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toCommunity)
}

export async function getDevelopers() {
  return rows(await publicClient().from("developers").select("*").eq("published", true).order("name"), toDeveloper)
}

export async function getDeveloper(slug: string) {
  return one(await publicClient().from("developers").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toDeveloper)
}

export async function getProjects() {
  return rows(await publicClient().from("projects").select("*").eq("published", true).order("handover"), toProject)
}

export async function getProject(slug: string) {
  return one(await publicClient().from("projects").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toProject)
}

/** Active funnels for a locale; expired and not-yet-started ones are hidden. */
export async function getFunnels(locale: Locale, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  return rows(
    await publicClient()
      .from("funnels")
      .select("*")
      .eq("active", true)
      .lte("starts_at", today)
      .or(`ends_at.is.null,ends_at.gte.${today}`)
      .or(`locales.is.null,locales.cs.{${locale}}`)
      .order("sort_order"),
    toFunnel,
  )
}

export async function getFunnel(slug: string) {
  return one(await publicClient().from("funnels").select("*").eq("slug", slug).eq("active", true).maybeSingle(), toFunnel)
}

// Visitors can read only these advisor columns (email and meeting link stay staff-only).
const AGENT_COLUMNS = "slug, name, role, languages, specialties, bio, brn, photo_url, responds_within, score"

export async function getAgents() {
  return rows(await publicClient().from("agents").select(AGENT_COLUMNS).eq("active", true).order("sort_order"), toAgent)
}

export async function getAgent(slug: string) {
  return one(await publicClient().from("agents").select(AGENT_COLUMNS).eq("slug", slug).eq("active", true).maybeSingle(), toAgent)
}

export async function getAdvisorReviews(slug: string): Promise<AdvisorReview[]> {
  const { data } = await publicClient().from("advisor_reviews").select("id, rating, comment, first_name, locale, created_at").eq("agent_slug", slug).eq("published", true).order("created_at", { ascending: false }).limit(20)
  return (data ?? []).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, firstName: r.first_name, locale: r.locale, createdAt: r.created_at }))
}

export async function getPosts(category?: string) {
  let query = publicClient().from("posts").select("*").eq("published", true).order("published_at", { ascending: false })
  if (category) query = query.eq("category", category)
  return rows(await query, toPost)
}

export async function getPost(slug: string) {
  return one(await publicClient().from("posts").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toPost)
}

export async function getReports() {
  return rows(await publicClient().from("reports").select("*").eq("published", true).eq("kind", "report").order("updated_at", { ascending: false }), toReport)
}

export async function getJobs() {
  return rows(await publicClient().from("jobs").select("*").eq("published", true), toJob)
}

export async function getJob(slug: string) {
  return one(await publicClient().from("jobs").select("*").eq("slug", slug).eq("published", true).maybeSingle(), toJob)
}

/** Company facts are confirmed by the client, not stored per row (see mock.ts). */
export async function getCompanyStats() {
  return companyStats
}

export async function getNameMaps() {
  const client = publicClient()
  const [c, d] = await Promise.all([client.from("communities").select("slug, name"), client.from("developers").select("slug, name")])
  return {
    communities: Object.fromEntries(rows(c, (r) => [r.slug as string, r.name as string] as const)),
    developers: Object.fromEntries(rows(d, (r) => [r.slug as string, r.name as string] as const)),
  }
}

export async function getPromises(developerSlug?: string): Promise<DeveloperPromise[]> {
  let query = publicClient().from("developer_promises").select("*").eq("published", true).order("due", { ascending: false, nullsFirst: false })
  if (developerSlug) query = query.eq("developer_slug", developerSlug)
  const { data } = await query
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    developerSlug: r.developer_slug as string,
    projectSlug: (r.project_slug as string) ?? null,
    category: r.category as DeveloperPromise["category"],
    promise: L(r.promise),
    source: (r.source as string) ?? null,
    due: (r.due as string) ?? null,
    status: r.status as DeveloperPromise["status"],
    evidence: (r.evidence as string) ?? null,
    evidenceUrl: (r.evidence_url as string) ?? null,
  }))
}

export async function getProjectProgress(projectSlug: string): Promise<ProgressPoint[]> {
  const { data } = await publicClient().from("project_progress").select("recorded_on, progress, source, note").eq("project_slug", projectSlug).order("recorded_on")
  return ((data ?? []) as Row[]).map((r) => ({ recordedOn: r.recorded_on as string, progress: Number(r.progress), source: r.source as ProgressPoint["source"], note: (r.note as string) ?? null }))
}
