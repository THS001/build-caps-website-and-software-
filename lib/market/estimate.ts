import "server-only"
import { supabaseConfigured } from "@/lib/supabase/config"
import { publicClient } from "@/lib/supabase/public"
import { getCommunity } from "@/lib/data"

// Buildcaps Estimate: a value range from comparable DLD sales (same area, same
// bedroom count, similar size, last 12 months), widened when data is thin.

const SQM_PER_SQFT = 0.09290304

export type Estimate = {
  low: number
  mid: number
  high: number
  sales: number
  latest: string | null
  basis: "exact" | "anyRooms"
  confidence: "high" | "medium" | "low"
}

const roomsLabel = (beds: number) => (beds === 0 ? "Studio" : `${beds} B/R`)

export async function estimateValue({ community, beds, sqft }: { community: string; beds: number; sqft: number }): Promise<Estimate | null> {
  if (!supabaseConfigured || !(sqft > 0)) return null
  const c = await getCommunity(community)
  const areas = c?.dldAreas ?? []
  if (!areas.length) return null
  const sqm = sqft * SQM_PER_SQFT
  const since = new Date()
  since.setUTCFullYear(since.getUTCFullYear() - 1)
  const client = publicClient()

  const attempt = async (rooms: string | null, spread: number) => {
    const { data } = await client.rpc("dld_comparables", {
      p_areas: areas,
      p_rooms: rooms,
      p_min_sqm: sqm * (1 - spread),
      p_max_sqm: sqm * (1 + spread),
      p_since: since.toISOString().slice(0, 10),
    })
    const row = (data as { sales: number; p25: number; median: number; p75: number; latest: string }[] | null)?.[0]
    return row && Number(row.sales) > 0 ? row : null
  }

  let basis: Estimate["basis"] = "exact"
  let row = await attempt(roomsLabel(beds), 0.2)
  if (!row || Number(row.sales) < 5) {
    row = await attempt(null, 0.3)
    basis = "anyRooms"
  }
  if (!row || Number(row.sales) < 3) return null

  const round = (v: number) => Math.round(v / 10_000) * 10_000
  const sales = Number(row.sales)
  return {
    low: round(Number(row.p25) * sqm),
    mid: round(Number(row.median) * sqm),
    high: round(Number(row.p75) * sqm),
    sales,
    latest: row.latest ? String(row.latest).slice(0, 10) : null,
    basis,
    confidence: sales >= 30 && basis === "exact" ? "high" : sales >= 10 ? "medium" : "low",
  }
}
