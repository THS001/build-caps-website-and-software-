import "server-only"
import { cache } from "react"
import { getCommunities, getProperties, localize } from "@/lib/data"
import { supabaseConfigured } from "@/lib/supabase/config"
import { publicClient } from "@/lib/supabase/public"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel, ToolProperty } from "@/lib/insights/types"

const SQM_PER_SQFT = 0.09290304
// Long-run prior for Dubai residential growth; projections lean on it so a
// recent boom or slump isn't simply extrapolated.
const LONG_RUN_GROWTH = 0.03
const DEFAULT_VOLATILITY = 0.12

// Illustrative Dubai cycle (index, 2015 = 100) used only until DLD history is
// loaded. Pages label every figure built on it as sample data.
const SAMPLE_INDEX: [number, number][] = [
  [2012, 70], [2013, 88], [2014, 105], [2015, 100], [2016, 95], [2017, 92], [2018, 86],
  [2019, 80], [2020, 76], [2021, 83], [2022, 96], [2023, 114], [2024, 130], [2025, 142], [2026, 148],
]

function stats(history: CommunityModel["history"]) {
  const recent = history.slice(-11)
  const logs = recent.slice(1).map((h, i) => Math.log(h.pricePerSqft / recent[i].pricePerSqft))
  if (logs.length < 3) return null
  const mean = logs.reduce((s, v) => s + v, 0) / logs.length
  const sd = Math.sqrt(logs.reduce((s, v) => s + (v - mean) ** 2, 0) / (logs.length - 1))
  return { mean: Math.exp(mean) - 1, sd }
}

/** Every community with growth, volatility and price history for the simulations. */
export const getMarketModel = cache(async (): Promise<CommunityModel[]> => {
  const communities = await getCommunities()
  const areas = [...new Set(communities.flatMap((c) => c.dldAreas ?? []))]
  let annual: { area_name: string; year: number; sales: number; ppsm: number }[] = []
  if (supabaseConfigured && areas.length) {
    const { data } = await publicClient().rpc("dld_annual", { p_areas: areas })
    annual = ((data ?? []) as typeof annual).map((r) => ({ ...r, sales: Number(r.sales), ppsm: Number(r.ppsm) }))
  }
  const thisYear = new Date().getUTCFullYear()

  return communities.map((c) => {
    const rows = annual.filter((r) => c.dldAreas?.includes(r.area_name))
    const byYear = new Map<number, { sum: number; sales: number }>()
    for (const r of rows) {
      const y = byYear.get(r.year) ?? { sum: 0, sales: 0 }
      y.sum += r.ppsm * r.sales
      y.sales += r.sales
      byYear.set(r.year, y)
    }
    const dldHistory = [...byYear]
      .filter(([, v]) => v.sales >= 10)
      .sort(([a], [b]) => a - b)
      .map(([year, v]) => ({ year, pricePerSqft: Math.round((v.sum / v.sales) * SQM_PER_SQFT), sales: v.sales }))
    const basis: CommunityModel["basis"] = dldHistory.length >= 4 ? "dld" : "sample"
    const last = SAMPLE_INDEX[SAMPLE_INDEX.length - 1][1]
    const history =
      basis === "dld"
        ? dldHistory
        : SAMPLE_INDEX.filter(([year]) => year <= thisYear).map(([year, index]) => ({ year, pricePerSqft: Math.round((c.avgPricePerSqft * index) / last), sales: 0 }))
    const s = stats(history)
    const historic = basis === "dld" && s ? s.mean : c.priceChange12m * 0.6
    return {
      slug: c.slug,
      name: c.name,
      pricePerSqft: c.avgPricePerSqft,
      grossYield: c.estYield,
      growth: Math.round((0.4 * Math.max(-0.1, Math.min(0.2, historic)) + 0.6 * LONG_RUN_GROWTH) * 1000) / 1000,
      volatility: Math.round(Math.min(0.3, Math.max(0.06, s?.sd ?? DEFAULT_VOLATILITY)) * 1000) / 1000,
      history,
      basis,
      waterfront: c.waterfront,
      geo: c.geo,
    }
  })
})

/** Published listings, reduced to what the tools need, with titles in the visitor's language. */
export async function getToolProperties(locale: Locale): Promise<ToolProperty[]> {
  const list = await getProperties()
  return list.map((p) => ({
    slug: p.slug,
    title: localize(p.title, locale),
    communitySlug: p.communitySlug,
    projectSlug: p.projectSlug ?? null,
    type: p.type,
    status: p.status,
    listing: p.listing,
    priceAed: p.priceAed,
    beds: p.beds,
    sqft: p.sqft,
    estYield: p.estYield ?? null,
    serviceChargePerSqft: p.serviceChargePerSqft ?? null,
    handover: p.handover,
    postHandover: Boolean(p.paymentPlan && p.paymentPlan.postHandover > 0),
    furnished: p.furnishing === "furnished",
    geo: p.geo,
    keywords: p.keywords,
  }))
}
