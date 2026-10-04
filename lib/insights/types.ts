// Client-safe shapes passed from the server to the AI tools.

/** What the simulations know about one community. Rates are decimals (0.05 = 5%). */
export type CommunityModel = {
  slug: string
  name: string
  pricePerSqft: number
  grossYield: number
  /** Expected yearly price growth used for projections (history blended with a long-run prior). */
  growth: number
  /** Yearly volatility of prices. */
  volatility: number
  /** Annual price per sq ft, oldest first. */
  history: { year: number; pricePerSqft: number; sales: number }[]
  /** "dld": Dubai Land Department sales; "sample": illustrative series until DLD data is loaded. */
  basis: "dld" | "sample"
  waterfront: boolean
  geo: { lat: number; lng: number }
}

/** A listing reduced to what the tools need. */
export type ToolProperty = {
  slug: string
  title: string
  communitySlug: string
  projectSlug: string | null
  type: string
  status: "offPlan" | "ready"
  listing: "sale" | "rent"
  priceAed: number | null
  beds: number
  sqft: number
  estYield: number | null
  serviceChargePerSqft: number | null
  handover: string | null
  postHandover: boolean
  furnished: boolean
  geo: { lat: number; lng: number }
  keywords: string[]
}
