import "server-only"
import { googleConfigured, googleFetch } from "@/lib/google/auth"
import { locales, type Locale } from "@/i18n/locales"

// Google Search Console (free). The service account must be added as a user on
// the property; GSC_SITE_URL is the property, e.g. "sc-domain:buildcaps.com".

const SCOPE = ["https://www.googleapis.com/auth/webmasters.readonly"]
const property = process.env.GSC_SITE_URL ?? ""
export const gscConfigured = googleConfigured && Boolean(property)

export type PageMetric = { page: string; clicks: number; impressions: number; ctr: number; position: number }
export type QueryMetric = PageMetric & { query: string }

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

const iso = (d: Date) => d.toISOString().slice(0, 10)

async function query(body: Record<string, unknown>) {
  const data = await googleFetch<{ rows?: Row[] }>(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, SCOPE, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.rows ?? []
}

/** Clicks, impressions, CTR and position per page between two dates. */
export async function pageMetrics(start: Date, end: Date, page?: string): Promise<PageMetric[]> {
  const rows = await query({
    startDate: iso(start),
    endDate: iso(end),
    dimensions: ["page"],
    rowLimit: 1000,
    ...(page ? { dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: page }] }] } : {}),
  })
  return rows.map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
}

/** Top queries with the page that ranks for them. */
export async function queryMetrics(start: Date, end: Date, limit = 500): Promise<QueryMetric[]> {
  const rows = await query({ startDate: iso(start), endDate: iso(end), dimensions: ["query", "page"], rowLimit: limit })
  return rows.map((r) => ({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
}

/** "https://buildcaps.com/ar/off-plan" → { locale: "ar", pathname: "/off-plan" }. */
export function splitPage(url: string): { locale: Locale; pathname: string } | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean)
    const first = parts[0] as Locale | undefined
    if (first && first !== "en" && (locales as readonly string[]).includes(first)) return { locale: first, pathname: `/${parts.slice(1).join("/")}` }
    return { locale: "en", pathname: `/${parts.join("/")}` }
  } catch {
    return null
  }
}

/** Typical CTR by position (organic, desktop and mobile blended); used to spot weak titles. */
export function expectedCtr(position: number) {
  const curve = [0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018]
  return position < 1 ? curve[0] : curve[Math.min(curve.length - 1, Math.round(position) - 1)] * (position > 10 ? 10 / position : 1)
}
