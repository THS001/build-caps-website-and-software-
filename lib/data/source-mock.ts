// Sample-data source (lib/data/mock.ts). Used until Supabase keys are configured.

import type { Locale } from "@/i18n/locales"
import * as db from "./mock"
import { isGoldenVisaEligible } from "./shared"
import { matchesLifestyle } from "@/lib/search/lifestyle"
import type { AdvisorReview, DeveloperPromise, ProgressPoint, Property, PropertyFilters } from "./types"

export async function getProperties(filters: PropertyFilters = {}) {
  let list = db.properties.filter((p) => {
    if (filters.status && p.status !== filters.status) return false
    if (filters.type && p.type !== filters.type) return false
    if (filters.community && p.communitySlug !== filters.community) return false
    if (filters.developer && p.developerSlug !== filters.developer) return false
    if (filters.minBeds !== undefined && p.beds < filters.minBeds) return false
    if (filters.minPrice !== undefined && (p.priceAed ?? 0) < filters.minPrice) return false
    if (filters.maxPrice !== undefined && (p.priceAed ?? Infinity) > filters.maxPrice) return false
    if (filters.handoverYear && (!p.handover || new Date(p.handover).getUTCFullYear() !== filters.handoverYear)) return false
    if (filters.goldenVisa && !isGoldenVisaEligible(p)) return false
    if (filters.postHandover && !(p.paymentPlan && p.paymentPlan.postHandover > 0)) return false
    if (!matchesLifestyle(p, filters)) return false
    if (filters.q) {
      const haystack = [p.title.en, p.description.en, p.communitySlug, p.type, ...p.keywords].join(" ").toLowerCase()
      if (!filters.q.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))) return false
    }
    return true
  })

  const by = filters.sort ?? "featured"
  const price = (p: Property) => p.priceAed ?? Infinity
  list = [...list].sort((a, b) => {
    switch (by) {
      case "priceAsc":
        return price(a) - price(b)
      case "priceDesc":
        return price(b) - price(a)
      case "yieldDesc":
        return (b.estYield ?? 0) - (a.estYield ?? 0)
      case "handoverAsc":
        return (a.handover ?? "0").localeCompare(b.handover ?? "0")
      case "newest":
        return b.publishedAt.localeCompare(a.publishedAt)
      default:
        return Number(!!b.featured) - Number(!!a.featured) || b.publishedAt.localeCompare(a.publishedAt)
    }
  })
  return list
}

export async function getProperty(slug: string) {
  return db.properties.find((p) => p.slug === slug) ?? null
}

export async function getFeaturedProperties(limit = 6) {
  return (await getProperties({ sort: "featured" })).filter((p) => p.featured).slice(0, limit)
}

export async function getSimilarProperties(property: Property, limit = 3) {
  return db.properties
    .filter((p) => p.slug !== property.slug)
    .map((p) => ({
      p,
      score:
        Number(p.communitySlug === property.communitySlug) * 3 +
        Number(p.type === property.type) * 2 +
        Number(p.status === property.status) +
        (1 - Math.min(1, Math.abs((p.priceAed ?? 0) - (property.priceAed ?? 0)) / (property.priceAed ?? 1))),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}

export async function getCommunities() {
  return db.communities
}

export async function getCommunity(slug: string) {
  return db.communities.find((c) => c.slug === slug) ?? null
}

export async function getDevelopers() {
  return db.developers
}

export async function getDeveloper(slug: string) {
  return db.developers.find((d) => d.slug === slug) ?? null
}

export async function getProjects() {
  return [...db.projects].sort((a, b) => a.handover.localeCompare(b.handover))
}

export async function getProject(slug: string) {
  return db.projects.find((p) => p.slug === slug) ?? null
}

/** Active funnels for a locale, hiding expired ones automatically. */
export async function getFunnels(locale: Locale, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  return db.funnels
    .filter((f) => f.startsAt <= today && (!f.endsAt || f.endsAt >= today))
    .filter((f) => f.locales === "all" || f.locales.includes(locale))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getFunnel(slug: string) {
  return db.funnels.find((f) => f.slug === slug) ?? null
}

export async function getAgents() {
  return db.agents
}

export async function getAgent(slug: string) {
  return db.agents.find((a) => a.slug === slug) ?? null
}

export async function getAdvisorReviews(_slug: string): Promise<AdvisorReview[]> {
  return []
}

export async function getPosts(category?: string) {
  const list = [...db.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return category ? list.filter((p) => p.category === category) : list
}

export async function getPost(slug: string) {
  return db.posts.find((p) => p.slug === slug) ?? null
}

export async function getReports() {
  return db.reports
}

export async function getJobs() {
  return db.jobs
}

export async function getJob(slug: string) {
  return db.jobs.find((j) => j.slug === slug) ?? null
}

export async function getCompanyStats() {
  return db.companyStats
}

/** Lookup maps for cards that show a community or developer name. */
export async function getNameMaps() {
  return {
    communities: Object.fromEntries(db.communities.map((c) => [c.slug, c.name])),
    developers: Object.fromEntries(db.developers.map((d) => [d.slug, d.name])),
  }
}

// The ledger and the construction pulse start empty: they hold only verified records.
export async function getPromises(developerSlug?: string): Promise<DeveloperPromise[]> {
  void developerSlug
  return []
}

export async function getProjectProgress(projectSlug: string): Promise<ProgressPoint[]> {
  void projectSlug
  return []
}
