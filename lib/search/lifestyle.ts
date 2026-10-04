// Lifestyle search (client-safe): commute at rush hour, schools and metro nearby,
// and the all-in monthly cost of a home. Drive times and distances come from
// the listing's `surroundings` (OpenStreetMap, filled when it is saved); without
// them, commutes fall back to a straight-line estimate.

import { monthlyPayment, maxLtv } from "@/lib/calc"
import { departures, landmarks, type LandmarkKey } from "@/lib/geo/landmarks"
import type { Property, PropertyFilters } from "@/lib/data/types"

export type Surroundings = {
  /** Free-flow driving minutes to each everyday destination. */
  commute: Partial<Record<LandmarkKey, number>>
  /** Kilometres to the nearest of each, within 1.5 km (missing = none that close). */
  nearest: Partial<Record<"school" | "metro" | "park" | "supermarket" | "beach", number>>
  /** False when the places lookup failed; the next refresh retries it. */
  complete?: boolean
  at: string
}

/** Destinations offered in the commute filter. */
export const commuteTargets = ["difc", "downtown", "businessBay", "internetCity", "marina", "dxb", "healthcareCity", "siliconOasis", "expoCity", "abuDhabi"] as const satisfies readonly LandmarkKey[]
export const NEAR_SCHOOL_KM = 1.5
export const NEAR_METRO_KM = 1

/** Rush-hour minutes when leaving at 08:00 on a weekday. */
export function rushMinutes(p: Pick<Property, "geo"> & { surroundings?: Surroundings | null }, to: LandmarkKey) {
  const free = p.surroundings?.commute[to] ?? estimateMinutes(p.geo, landmarks[to])
  return Math.round(free * departures["08:00"])
}

function estimateMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(h)) * 1.35
  return (km / 55) * 60 + 4
}

// Assumptions behind the monthly cost, shown next to the filter.
export const MONTHLY = { rate: 4.5, years: 25, serviceChargePerSqft: 15, utilitiesPerSqft: 0.6 }

/**
 * All-in monthly cost: for a purchase, the mortgage at the usual resident
 * loan-to-value plus service charge and utilities; for a rental, rent plus utilities.
 */
export function monthlyCost(p: Pick<Property, "priceAed" | "listing" | "sqft" | "serviceChargePerSqft">) {
  if (p.priceAed === null) return null
  const utilities = p.sqft * MONTHLY.utilitiesPerSqft
  if (p.listing === "rent") return Math.round(p.priceAed / 12 + utilities)
  const loan = p.priceAed * maxLtv(p.priceAed, true)
  const service = (p.sqft * (p.serviceChargePerSqft ?? MONTHLY.serviceChargePerSqft)) / 12
  return Math.round(monthlyPayment(loan, MONTHLY.rate, MONTHLY.years) + service + utilities)
}

/** True when a listing passes every lifestyle filter that is set. */
export function matchesLifestyle(p: Property, f: PropertyFilters) {
  if (f.commuteTo && f.commuteMax && rushMinutes(p, f.commuteTo) > f.commuteMax) return false
  if (f.nearSchool && !((p.surroundings?.nearest.school ?? Infinity) <= NEAR_SCHOOL_KM)) return false
  if (f.nearMetro && !((p.surroundings?.nearest.metro ?? Infinity) <= NEAR_METRO_KM)) return false
  if (f.maxMonthly) {
    const cost = monthlyCost(p)
    if (cost === null || cost > f.maxMonthly) return false
  }
  return true
}

export const hasLifestyleFilter = (f: PropertyFilters) => Boolean((f.commuteTo && f.commuteMax) || f.nearSchool || f.nearMetro || f.maxMonthly)
