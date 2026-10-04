import type { Locale } from "@/i18n/locales"
import type { LandmarkKey } from "@/lib/geo/landmarks"
import type { Surroundings } from "@/lib/search/lifestyle"

/** Text stored per language; English is always present and is the fallback. */
export type Localized = { en: string } & Partial<Record<Locale, string>>

export type PropertyStatus = "offPlan" | "ready"
export type ListingType = "sale" | "rent"
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "duplex" | "plot" | "office" | "retail"

export type PaymentPlan = {
  onBooking: number
  duringConstruction: number
  onHandover: number
  postHandover: number
}

export type Property = {
  slug: string
  title: Localized
  description: Localized
  status: PropertyStatus
  listing: ListingType
  type: PropertyType
  communitySlug: string
  developerSlug: string
  projectSlug?: string
  /** AED; null means "price on request". */
  priceAed: number | null
  beds: number
  baths: number
  sqft: number
  /** ISO date of expected handover; null for ready properties. */
  handover: string | null
  paymentPlan?: PaymentPlan
  /** Estimated gross yield as a ratio (0.072 = 7.2%). */
  estYield?: number
  serviceChargePerSqft?: number
  furnishing?: "furnished" | "unfurnished" | "partly"
  amenities: string[]
  images: { src: string; alt: Localized }[]
  geo: { lat: number; lng: number }
  /** DLD Trakheesi advertising permit; listings without one are never published. */
  permit: string
  agentSlug: string
  featured?: boolean
  badge?: "newLaunch" | "exclusive" | "soldOut"
  keywords: string[]
  publishedAt: string
  /** Set when an advisor confirmed the AI photo check (Verified Listing badge). */
  verifiedAt?: string | null
  /** Drive times and nearby amenities for the lifestyle filters. */
  surroundings?: Surroundings | null
}

export type Project = {
  slug: string
  name: string
  developerSlug: string
  communitySlug: string
  summary: Localized
  launchPriceAed: number
  handover: string
  paymentPlan: PaymentPlan
  unitTypes: string
  constructionProgress: number
  escrowRegistered: boolean
  geo: { lat: number; lng: number }
  /** Storeys, for the Future Skyline View massing. */
  floors?: number | null
  launchedOn?: string | null
}

export type PromiseStatus = "pending" | "delivered" | "partly" | "broken"

/** One promise from a developer's brochure or SPA, and whether it was kept (Promise Ledger). */
export type DeveloperPromise = {
  id: string
  developerSlug: string
  projectSlug: string | null
  category: "handover" | "amenity" | "specification" | "payment" | "community" | "other"
  promise: Localized
  source: string | null
  due: string | null
  status: PromiseStatus
  evidence: string | null
  evidenceUrl: string | null
}

/** A recorded construction progress reading (Handover Truth Score pulse). */
export type ProgressPoint = {
  recordedOn: string
  progress: number
  source: "rera" | "site_visit" | "developer" | "satellite"
  note: string | null
}

export type Community = {
  slug: string
  name: string
  summary: Localized
  lifestyle: Localized
  schools: Localized
  transport: Localized
  avgPricePerSqft: number
  estYield: number
  priceChange12m: number
  geo: { lat: number; lng: number }
  waterfront: boolean
  /** DLD open-data area names that make up this community (for estimates and the Data Room). */
  dldAreas?: string[]
}

export type Developer = {
  slug: string
  name: string
  founded?: number
  summary: Localized
  /** Track-record metrics stay null until verified data exists (M8/M10). */
  deliveredProjects: number | null
  onTimeRate: number | null
  promisesKept: number | null
}

export type Funnel = {
  /** Database id; absent in the sample data (clicks are only logged with Supabase). */
  id?: string
  slug: string
  title: Localized
  pitch: Localized
  keyNumber: { label: Localized; value: string }
  tag: Localized
  externalUrl: string
  startsAt: string
  endsAt: string | null
  locales: Locale[] | "all"
  sortOrder: number
  imageUrl?: string | null
}

export type Agent = {
  slug: string
  name: string
  role: "propertyAdvisor" | "seniorPropertyAdvisor" | "salesDirector" | "ceo"
  languages: Locale[]
  specialties: string[]
  bio: Localized
  brn: string | null
  photo?: string
  respondsWithin: string
  /** Advisor Score, recomputed nightly; shown only when `ready`. */
  score?: AdvisorScore | null
}

export type AdvisorScore = {
  /** Enough evidence to publish (5 meetings or 3 verified reviews). */
  ready: boolean
  score: number | null
  meetings: number
  showRate: number | null
  responseMinutes: number | null
  rating: number | null
  reviews: number
  deals: number
  languages: number
  strengths: ("topRated" | "fastResponse" | "reliable" | "dealMaker" | "multilingual")[]
  summary: Partial<Record<Locale, string>> | null
  hash: string
}

/** A verified review: left through the private link of a meeting that took place. */
export type AdvisorReview = { id: string; rating: number; comment: string | null; firstName: string | null; locale: string; createdAt: string }

export type PostCategory = "market" | "guides" | "offPlan" | "communities" | "news"

export type Post = {
  slug: string
  title: Localized
  excerpt: Localized
  body: Localized[]
  category: PostCategory
  author: string
  publishedAt: string
  minutes: number
  /** Cover photo uploaded in the admin; a category photo stands in without one. */
  coverUrl?: string | null
}

export type Report = {
  slug: string
  title: Localized
  quarter: string
  summary: Localized
}

export type Job = {
  slug: string
  title: Localized
  location: string
  type: Localized
  summary: Localized
  requirements: Localized[]
}

export type PropertyFilters = {
  status?: PropertyStatus
  type?: PropertyType
  community?: string
  developer?: string
  minBeds?: number
  minPrice?: number
  maxPrice?: number
  handoverYear?: number
  goldenVisa?: boolean
  postHandover?: boolean
  q?: string
  /** Lifestyle: at most `commuteMax` minutes to `commuteTo`, leaving at 08:00. */
  commuteTo?: LandmarkKey
  commuteMax?: number
  nearSchool?: boolean
  nearMetro?: boolean
  /** All-in monthly cost (mortgage or rent, service charge, utilities), AED. */
  maxMonthly?: number
  sort?: "featured" | "priceAsc" | "priceDesc" | "yieldDesc" | "handoverAsc" | "newest"
}
