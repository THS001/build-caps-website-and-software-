import type { PropertyFilters, PropertyType } from "@/lib/data/types"
import { landmarkKeys, type LandmarkKey } from "@/lib/geo/landmarks"

const isLandmark = (v: string | undefined) => (landmarkKeys as string[]).includes(v ?? "")

// Rule-based reading of a free-text search ("2-bed sea view under AED 2.5M, handover 2027").
// English keywords only; M8 replaces this with Claude tool-use for all 10 languages.

const TYPES: Record<string, PropertyType> = {
  villa: "villa",
  villas: "villa",
  townhouse: "townhouse",
  townhouses: "townhouse",
  penthouse: "penthouse",
  duplex: "duplex",
  apartment: "apartment",
  apartments: "apartment",
  flat: "apartment",
  studio: "apartment",
}

const COMMUNITY_ALIASES: Record<string, string> = {
  marina: "dubai-marina",
  downtown: "downtown-dubai",
  palm: "palm-jumeirah",
  "business bay": "business-bay",
  "dubai hills": "dubai-hills-estate",
  hills: "dubai-hills-estate",
  jvc: "jumeirah-village-circle",
  "jumeirah village": "jumeirah-village-circle",
  creek: "dubai-creek-harbour",
}

function amount(value: string, unit?: string) {
  const n = Number(value.replace(/,/g, ""))
  if (!Number.isFinite(n)) return undefined
  const u = unit?.toLowerCase()
  if (u === "m" || u === "mn" || u === "million") return n * 1_000_000
  if (u === "k" || u === "thousand") return n * 1_000
  // Bare small numbers in a price context mean millions ("under 2.5").
  return n < 100 ? n * 1_000_000 : n
}

export function parseQuery(text: string, communities: { slug: string; name: string }[]): PropertyFilters {
  const q = text.toLowerCase()
  const filters: PropertyFilters = {}

  const beds = q.match(/(\d+)\s*-?\s*(?:bed|br|bedroom)/)
  if (beds) filters.minBeds = Number(beds[1])
  else if (/\bstudio\b/.test(q)) filters.minBeds = 0

  const max = q.match(/(?:under|below|max(?:imum)?|up to|less than|<)\s*(?:aed\s*)?([\d.,]+)\s*(m|mn|million|k|thousand)?/)
  if (max) filters.maxPrice = amount(max[1], max[2])
  const min = q.match(/(?:over|above|from|min(?:imum)?|more than|>)\s*(?:aed\s*)?([\d.,]+)\s*(m|mn|million|k|thousand)?/)
  if (min) filters.minPrice = amount(min[1], min[2])

  if (/off[\s-]?plan/.test(q)) filters.status = "offPlan"
  else if (/\bready\b|move in/.test(q)) filters.status = "ready"

  for (const [word, type] of Object.entries(TYPES)) {
    if (new RegExp(`\\b${word}\\b`).test(q)) {
      filters.type = type
      break
    }
  }

  const year = q.match(/\b(20[2-4]\d)\b/)
  if (year) filters.handoverYear = Number(year[1])

  if (/golden\s*visa/.test(q)) filters.goldenVisa = true
  if (/post[\s-]?handover/.test(q)) filters.postHandover = true

  const named = communities.find((c) => q.includes(c.name.toLowerCase()))
  if (named) filters.community = named.slug
  else {
    const alias = Object.keys(COMMUNITY_ALIASES).find((a) => q.includes(a))
    if (alias) filters.community = COMMUNITY_ALIASES[alias]
  }

  if (/yield|rental income|return/.test(q)) filters.sort = "yieldDesc"

  return filters
}

/** Filters ⇄ URL query string for /properties. */
export function filtersToParams(filters: PropertyFilters) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.type) params.set("type", filters.type)
  if (filters.community) params.set("community", filters.community)
  if (filters.developer) params.set("developer", filters.developer)
  if (filters.minBeds !== undefined) params.set("beds", String(filters.minBeds))
  if (filters.minPrice !== undefined) params.set("min", String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set("max", String(filters.maxPrice))
  if (filters.handoverYear) params.set("handover", String(filters.handoverYear))
  if (filters.goldenVisa) params.set("gv", "1")
  if (filters.postHandover) params.set("ph", "1")
  if (filters.commuteTo && filters.commuteMax) {
    params.set("to", filters.commuteTo)
    params.set("mins", String(filters.commuteMax))
  }
  if (filters.nearSchool) params.set("school", "1")
  if (filters.nearMetro) params.set("metro", "1")
  if (filters.maxMonthly) params.set("monthly", String(filters.maxMonthly))
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort)
  return params
}

export function paramsToFilters(params: Record<string, string | string[] | undefined>): PropertyFilters {
  const get = (key: string) => {
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }
  const num = (key: string) => {
    const v = get(key)
    return v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined
  }
  const status = get("status")
  const sort = get("sort")
  return {
    status: status === "offPlan" || status === "ready" ? status : undefined,
    type: (get("type") as PropertyType) || undefined,
    community: get("community") || undefined,
    developer: get("developer") || undefined,
    minBeds: num("beds"),
    minPrice: num("min"),
    maxPrice: num("max"),
    handoverYear: num("handover"),
    goldenVisa: get("gv") === "1" || undefined,
    postHandover: get("ph") === "1" || undefined,
    commuteTo: isLandmark(get("to")) && num("mins") ? (get("to") as LandmarkKey) : undefined,
    commuteMax: isLandmark(get("to")) ? num("mins") : undefined,
    nearSchool: get("school") === "1" || undefined,
    nearMetro: get("metro") === "1" || undefined,
    maxMonthly: num("monthly"),
    sort: (["featured", "priceAsc", "priceDesc", "yieldDesc", "handoverAsc", "newest"] as const).find((s) => s === sort),
  }
}
