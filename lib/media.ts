// Licensed stock photography and video for the site's own pages (headers, area
// cards, banners). Photos: Unsplash License; video: Pexels License. Both allow
// free commercial use; credits are listed here and on /credits.
//
// Never use these for a listing or a person: listings show their own photos and
// advisors their own portraits. Where a listing has no photos yet, its area photo
// stands in, labelled as such.

export type StockPhoto = {
  /** Unsplash image id (images.unsplash.com/<id>). */
  id: string
  /** Short English description, used where the image carries meaning. */
  alt: string
  credit: string
  page: string
}

const u = (id: string, alt: string, credit: string, slug: string): StockPhoto => ({ id: `photo-${id}`, alt, credit, page: `https://unsplash.com/photos/${slug}` })

export const photos = {
  marinaNight: u("1749849934727-bc57c0bd9dd2", "Dubai Marina skyline lit up at night", "Ben Koorengevel", "Ul-h35vIJiM"),
  marinaBoats: u("1761341063556-80cb742411b6", "Boats and towers in Dubai Marina at night", "Matthias", "_rwQFbH293k"),
  burjSunset: u("1749273858638-ea678cb48e94", "Burj Khalifa over the Dubai skyline at sunset", "Marlene Céline Nordvik", "9n7rZJLWY7o"),
  downtownDusk: u("1671818786462-b55a5bb49a23", "Downtown Dubai at dusk", "Alla Rome", "vqNkSYxraEA"),
  palmAerial: u("1748373491503-bf21fe5ef9e2", "Aerial view of the Dubai coastline and Palm islands", "Nejc Soklič", "dYLzGcPqrtE"),
  businessBay: u("1745750434535-5943ef2fd31a", "Business Bay towers on the water", "Sirav Talwar", "lMo2HjtoUpM"),
  creekSunset: u("1642504636516-9f897fb37fe8", "Dubai Creek Harbour at sunset", "Vandan Patel", "cjijfGQqQlQ"),
  burjCrane: u("1739900345763-391d9b62c938", "A construction crane beside the Burj Khalifa", "Nejc Soklič", "O8IjeygwJlc"),
  construction: u("1722435784805-ad8d59dadd9d", "A tower under construction in Dubai", "Robin Irfan", "UxYEwaanctE"),
  livingRoom: u("1758565811176-ccd94357a844", "A modern living room with large windows", "Caroline Badran", "12WFO8yWrsw"),
  sheikhZayed: u("1703573198169-8116f12327ee", "Sheikh Zayed Road at night", "Michael Starkie", "sTOQG-SAFqY"),
  neighbourhood: u("1640877268187-2fa6b2ed7a5f", "Aerial view of a Dubai residential neighbourhood", "Eslam Tawakol", "TqouW9u0qmk"),
  greenLawn: u("1743819455744-05417bf55cea", "Residential buildings beside a green lawn in Dubai", "Ben Koorengevel", "lotxjfRcx80"),
  villaPool: u("1640880997996-c166edb0ba5e", "Aerial view of a villa with a pool, Jumeirah Islands", "Eslam Tawakol", "4mcc0wEhmlM"),
  townhouses: u("1743819458014-f5cf74f175e3", "Townhouses against the Dubai skyline", "Ben Koorengevel", "VGaXW263gOY"),
  modernVilla: u("1782720829237-ec146b0afe0a", "A modern villa with palm trees", "Maverick Frame", "SkkkMThTstg"),
  office: u("1760611656071-a8bef0578874", "A modern office with a city view", "David Kristianto", "FJzZWknsvMs"),
} satisfies Record<string, StockPhoto>

export type PhotoKey = keyof typeof photos

/** Sized URL from Unsplash's image CDN (resizing and WebP/AVIF happen there, not on our host). */
export function photoUrl(photo: StockPhoto, width: number, quality = 72) {
  return `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=${width}&q=${quality}`
}

/** Home hero video. Desktop gets the 1080p skyline aerial, phones a ~0.7 MB clip. */
export const heroVideo = {
  desktop: "https://videos.pexels.com/video-files/30048213/12888884_1920_1080_30fps.mp4",
  mobile: "https://videos.pexels.com/video-files/1660911/1660911-sd_960_540_30fps.mp4",
  poster: photos.downtownDusk,
  credits: [
    { credit: "Nelemson G", page: "https://www.pexels.com/video/dynamic-aerial-view-of-dubai-s-bustling-skyline-30048213/" },
    { credit: "The Lazy Artist Gallery", page: "https://www.pexels.com/video/drone-footage-of-dubai-1660911/" },
  ],
}

// Area photos: the right one for known communities, otherwise a stable pick.
const BY_COMMUNITY: Record<string, PhotoKey> = {
  "dubai-marina": "marinaNight",
  "jumeirah-beach-residence": "marinaBoats",
  jbr: "marinaBoats",
  "downtown-dubai": "burjSunset",
  downtown: "burjSunset",
  "palm-jumeirah": "palmAerial",
  "business-bay": "businessBay",
  "dubai-creek-harbour": "creekSunset",
  "dubai-hills-estate": "greenLawn",
  "jumeirah-village-circle": "townhouses",
  "jumeirah-islands": "villaPool",
  "arabian-ranches": "modernVilla",
}
const AREA_FALLBACK: PhotoKey[] = ["downtownDusk", "neighbourhood", "greenLawn", "townhouses", "sheikhZayed", "businessBay", "modernVilla"]

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export function areaPhoto(slug: string): StockPhoto {
  return photos[BY_COMMUNITY[slug] ?? AREA_FALLBACK[hash(slug) % AREA_FALLBACK.length]]
}

/** Article covers by category, when an article has no cover of its own. */
const BY_CATEGORY: Record<string, PhotoKey[]> = {
  market: ["burjSunset", "businessBay", "sheikhZayed"],
  guides: ["livingRoom", "modernVilla", "office"],
  offPlan: ["construction", "burjCrane"],
  communities: ["neighbourhood", "palmAerial", "greenLawn"],
  news: ["downtownDusk", "marinaNight", "creekSunset"],
}

export function categoryPhoto(category: string, seed: string): StockPhoto {
  const list = BY_CATEGORY[category] ?? BY_CATEGORY.news
  return photos[list[hash(seed) % list.length]]
}

/** Any stable photo for a seed (opportunity cards, banners). */
export function seededPhoto(seed: string, from: PhotoKey[] = Object.keys(photos) as PhotoKey[]): StockPhoto {
  return photos[from[hash(seed) % from.length]]
}
