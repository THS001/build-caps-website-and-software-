import "server-only"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { drive, fetchPlaces } from "@/lib/geo/osm"
import { landmarkKeys, landmarks } from "@/lib/geo/landmarks"
import type { Surroundings } from "@/lib/search/lifestyle"

// Fills a listing's `surroundings` for the lifestyle filters: drive times to
// everyday destinations (OSRM) and the nearest school, metro, park, supermarket
// and beach (Overpass). Free OpenStreetMap services, so requests are few at a time.

const NEARBY = ["school", "metro", "park", "supermarket", "beach"] as const

export async function computeSurroundings(at: { lat: number; lng: number }): Promise<Surroundings> {
  const commute: Surroundings["commute"] = {}
  for (let i = 0; i < landmarkKeys.length; i += 3) {
    const batch = landmarkKeys.slice(i, i + 3)
    const routes = await Promise.all(batch.map((key) => drive(at, landmarks[key])))
    batch.forEach((key, j) => (commute[key] = Math.round(routes[j].minutes)))
  }
  const nearest: Surroundings["nearest"] = {}
  let complete = true
  try {
    for (const p of await fetchPlaces(at, "en")) {
      const kind = p.kind as (typeof NEARBY)[number]
      if ((NEARBY as readonly string[]).includes(kind) && (nearest[kind] === undefined || p.km < nearest[kind]!)) nearest[kind] = Math.round(p.km * 100) / 100
    }
  } catch {
    // Overpass busy: keep the drive times; the next refresh fills the rest.
    complete = false
  }
  return { commute, nearest, complete, at: new Date().toISOString() }
}

/** Recomputes one listing (after it is saved) or the stalest few (weekly cron). */
export async function refreshSurroundings(opts: { id?: string; limit?: number; budgetMs?: number } = {}) {
  if (!adminConfigured) return 0
  const started = Date.now()
  const supabase = adminClient()
  let query = supabase.from("properties").select("id, lat, lng, surroundings")
  query = opts.id ? query.eq("id", opts.id) : query.eq("published", true).order("updated_at", { ascending: true }).limit(200)
  const { data } = await query
  const stale = (data ?? [])
    .filter((p) => {
      const s = p.surroundings as Surroundings | null
      return opts.id || !s || s.complete === false || Date.now() - new Date(s.at).getTime() > 90 * 86_400_000
    })
    .slice(0, opts.limit ?? 20)
  let done = 0
  for (const p of stale) {
    // Stop early rather than run past the function time limit.
    if (opts.budgetMs && Date.now() - started > opts.budgetMs) break
    const surroundings = await computeSurroundings({ lat: Number(p.lat), lng: Number(p.lng) })
    await supabase.from("properties").update({ surroundings }).eq("id", p.id)
    done++
  }
  return done
}
