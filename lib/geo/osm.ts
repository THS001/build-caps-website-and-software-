import "server-only"

// Free OpenStreetMap services: OSRM for driving routes and Overpass for places
// and building footprints. Both default to the public instances, which ask for
// light, cached use; set OSRM_URL / OVERPASS_URL to self-hosted ones at scale.

const OSRM = process.env.OSRM_URL ?? "https://router.project-osrm.org"
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter"
const HEADERS = { "user-agent": `Buildcaps/1.0 (+${process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildcaps.com"})` }

type LatLng = { lat: number; lng: number }

const memo = new Map<string, Promise<unknown>>()
function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key)
  if (hit) return hit as Promise<T>
  const p = load().catch((e) => {
    memo.delete(key)
    throw e
  })
  if (memo.size > 500) memo.clear()
  memo.set(key, p)
  return p
}

export function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 12_742 * Math.asin(Math.sqrt(h))
}

/** Free-flow driving time and distance; estimated from straight-line distance when OSRM is unreachable. */
export async function drive(from: LatLng, to: LatLng): Promise<{ minutes: number; km: number; source: "osrm" | "estimate" }> {
  const key = `osrm:${from.lat.toFixed(4)},${from.lng.toFixed(4)};${to.lat.toFixed(4)},${to.lng.toFixed(4)}`
  try {
    return await remember(key, async () => {
      const res = await fetch(`${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 * 60 * 24 * 30 },
      })
      const data = (await res.json()) as { routes?: { duration: number; distance: number }[] }
      const route = data.routes?.[0]
      if (!res.ok || !route) throw new Error("no route")
      return { minutes: route.duration / 60, km: route.distance / 1000, source: "osrm" as const }
    })
  } catch {
    const km = distanceKm(from, to) * 1.35
    return { minutes: (km / 55) * 60 + 4, km, source: "estimate" }
  }
}

// Public Overpass servers are busy at times (429, 504, or a 200 with a timeout
// remark and no data), so we try mirrors in turn and only remember successes.
const OVERPASS_MIRRORS = [OVERPASS, "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"].filter((u, i, all) => all.indexOf(u) === i)

async function overpass<T extends { elements: unknown[]; remark?: string }>(query: string): Promise<T> {
  return remember(`op:${query}`, async () => {
    let last: unknown = null
    for (const server of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(`${server}?data=${encodeURIComponent(query)}`, { headers: HEADERS, signal: AbortSignal.timeout(20_000), cache: "no-store" })
        if (!res.ok) throw new Error(`Overpass ${res.status}`)
        const data = (await res.json()) as T
        if (!data.elements?.length && data.remark) throw new Error(`Overpass: ${data.remark}`)
        return data
      } catch (error) {
        last = error
      }
    }
    throw last ?? new Error("Overpass unavailable")
  })
}

type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }

export const placeKinds = ["cafe", "restaurant", "supermarket", "gym", "park", "school", "health", "worship", "metro", "beach"] as const
export type PlaceKind = (typeof placeKinds)[number]
export type Place = { kind: PlaceKind; name: string; km: number; religion?: string }

function kindOf(tags: Record<string, string>): PlaceKind | null {
  if (tags.amenity === "cafe") return "cafe"
  if (tags.amenity === "restaurant") return "restaurant"
  if (tags.shop === "supermarket") return "supermarket"
  if (tags.leisure === "fitness_centre" || tags.leisure === "sports_centre") return "gym"
  if (tags.leisure === "park") return "park"
  if (tags.amenity === "school") return "school"
  if (["clinic", "hospital", "doctors"].includes(tags.amenity)) return "health"
  if (tags.amenity === "place_of_worship") return "worship"
  if (tags.railway === "station") return "metro"
  if (tags.natural === "beach") return "beach"
  return null
}

/** Everyday places within walking or short driving distance, nearest first. Empty on failure. */
export async function placesNear(at: LatLng, locale: string): Promise<Place[]> {
  return fetchPlaces(at, locale).catch(() => [])
}

/** As placesNear, but throws when Overpass is unavailable (so callers can retry later). */
export async function fetchPlaces(at: LatLng, locale: string): Promise<Place[]> {
  const around = (m: number) => `(around:${m},${at.lat.toFixed(5)},${at.lng.toFixed(5)})`
  const query = `[out:json][timeout:20];(
nwr${around(1500)}["amenity"~"^(cafe|restaurant|school|clinic|hospital|doctors|place_of_worship)$"];
nwr${around(1500)}["shop"="supermarket"];
nwr${around(1500)}["leisure"~"^(fitness_centre|sports_centre|park)$"];
nwr${around(2500)}["railway"="station"];
nwr${around(3000)}["natural"="beach"];
);out tags center 600;`
  {
    const data = await overpass<{ elements: Element[] }>(query)
    const places: Place[] = []
    for (const e of data.elements) {
      const tags = e.tags ?? {}
      const kind = kindOf(tags)
      const lat = e.lat ?? e.center?.lat
      const lon = e.lon ?? e.center?.lon
      if (!kind || lat === undefined || lon === undefined) continue
      const name = tags[`name:${locale}`] ?? tags["name:en"] ?? tags.name
      places.push({ kind, name: name ?? "", km: distanceKm(at, { lat, lng: lon }), religion: tags.religion })
    }
    return places.sort((a, b) => a.km - b.km)
  }
}

export type Footprint = { id: number; height: number; points: [number, number][] }

/** Building footprints with heights (OSM height, or levels × 3.2 m, or a typical default). */
export async function buildingsNear(at: LatLng, radius = 600): Promise<Footprint[]> {
  const query = `[out:json][timeout:25];way(around:${radius},${at.lat.toFixed(5)},${at.lng.toFixed(5)})["building"];out tags geom 1500;`
  try {
    const data = await overpass<{ elements: Element[] }>(query)
    return data.elements
      .filter((e) => e.geometry && e.geometry.length >= 3)
      .map((e) => {
        const tags = e.tags ?? {}
        const h = parseFloat(tags.height ?? "")
        const levels = parseFloat(tags["building:levels"] ?? "")
        const fallback = ["apartments", "residential", "hotel", "office", "commercial"].includes(tags.building) ? 24 : tags.building === "house" || tags.building === "villa" ? 8 : 10
        return {
          id: e.id,
          height: Number.isFinite(h) && h > 0 ? h : Number.isFinite(levels) && levels > 0 ? levels * 3.2 : fallback,
          points: e.geometry!.map((g) => [g.lat, g.lon] as [number, number]),
        }
      })
  } catch {
    return []
  }
}
