import "server-only"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { site } from "@/lib/site"

// Listing feeds for the UAE portals: list once on buildcaps.com, and Property
// Finder, Bayut and dubizzle import the same listings from these XML files.
// Only published listings with a real DLD (Trakheesi) permit are included.
// Field names follow each portal's XML spec; their onboarding team confirms the
// mapping (community names especially) before the feed goes live.

export const portals = ["property-finder", "bayut", "dubizzle"] as const
export type Portal = (typeof portals)[number]

type Row = {
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  status: "offPlan" | "ready"
  listing: "sale" | "rent"
  type: "apartment" | "villa" | "townhouse" | "penthouse" | "duplex"
  price_aed: number | null
  beds: number
  baths: number
  sqft: number
  handover: string | null
  service_charge_per_sqft: number | null
  furnishing: "furnished" | "unfurnished" | "partly" | null
  amenities: string[]
  images: { src: string }[]
  lat: number
  lng: number
  permit: string
  updated_at: string
  communities: { name: string } | null
  projects: { name: string } | null
  agents: { name: string; email: string | null; brn: string | null } | null
}

const xml = (v: unknown) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
const cdata = (v: unknown) => `<![CDATA[${String(v ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`
const stamp = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 19)
const absolute = (src: string) => (/^https?:\/\//.test(src) ? src : new URL(src, site.url).toString())
const ref = (slug: string) => `BC-${slug}`.slice(0, 50)
const phone = site.phones[0].display.replace(/\s/g, "")
const listingUrl = (slug: string) => new URL(`/properties/${slug}`, site.url).toString()

async function listings(): Promise<Row[]> {
  if (!adminConfigured) return []
  const { data, error } = await adminClient()
    .from("properties")
    .select("slug, title, description, status, listing, type, price_aed, beds, baths, sqft, handover, service_charge_per_sqft, furnishing, amenities, images, lat, lng, permit, updated_at, communities(name), projects(name), agents(name, email, brn)")
    .eq("published", true)
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Row[]).filter((r) => r.permit && !/^(PENDING|SAMPLE)/i.test(r.permit))
}

/* ── Property Finder ──────────────────────────────────────────────────── */

const PF_TYPE: Record<Row["type"], string> = { apartment: "AP", villa: "VH", townhouse: "TH", penthouse: "PH", duplex: "DX" }
const FURNISHED: Record<NonNullable<Row["furnishing"]>, string> = { furnished: "Yes", unfurnished: "No", partly: "Partly" }

function propertyFinder(rows: Row[]) {
  const items = rows.map((r) => {
    const price = r.price_aed === null ? "" : r.listing === "rent" ? `<price><yearly>${r.price_aed}</yearly></price>` : `<price>${r.price_aed}</price>`
    return `  <property last_update="${stamp(r.updated_at)}">
    <reference_number>${xml(ref(r.slug))}</reference_number>
    <permit_number>${xml(r.permit)}</permit_number>
    <offering_type>${r.listing === "rent" ? "RR" : "RS"}</offering_type>
    <property_type>${PF_TYPE[r.type]}</property_type>
    <price_on_application>${r.price_aed === null ? "Yes" : "No"}</price_on_application>
    ${price}
    <city>Dubai</city>
    <community>${xml(r.communities?.name)}</community>
    <property_name>${xml(r.projects?.name ?? "")}</property_name>
    <title_en>${cdata(r.title.en)}</title_en>
    ${r.title.ar ? `<title_ar>${cdata(r.title.ar)}</title_ar>` : ""}
    <description_en>${cdata(r.description.en)}</description_en>
    ${r.description.ar ? `<description_ar>${cdata(r.description.ar)}</description_ar>` : ""}
    <size>${r.sqft}</size>
    <bedroom>${r.beds === 0 ? "Studio" : r.beds}</bedroom>
    <bathroom>${r.baths}</bathroom>
    <completion_status>${r.status === "offPlan" ? "off_plan" : "completed"}</completion_status>
    ${r.furnishing ? `<furnished>${FURNISHED[r.furnishing]}</furnished>` : ""}
    ${r.service_charge_per_sqft ? `<service_charge>${r.service_charge_per_sqft}</service_charge>` : ""}
    <private_amenities>${xml(r.amenities.join(","))}</private_amenities>
    <geopoints>${r.lng},${r.lat}</geopoints>
    <agent>
      <name>${xml(r.agents?.name ?? site.name)}</name>
      <email>${xml(r.agents?.email ?? site.email)}</email>
      <phone>${xml(phone)}</phone>
      ${r.agents?.brn ? `<license_no>${xml(r.agents.brn)}</license_no>` : ""}
    </agent>
    <photo>
${r.images.map((i) => `      <url last_update="${stamp(r.updated_at)}" watermark="no">${xml(absolute(i.src))}</url>`).join("\n")}
    </photo>
  </property>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<list last_update="${stamp(new Date().toISOString())}" listing_count="${rows.length}">
${items.join("\n")}
</list>
`
}

/* ── Bayut and dubizzle (Dubizzle Group format) ───────────────────────── */

const DG_TYPE: Record<Row["type"], string> = { apartment: "Apartment", villa: "Villa", townhouse: "Townhouse", penthouse: "Penthouse", duplex: "Duplex" }

function dubizzleGroup(rows: Row[], portal: "bayut" | "dubizzle") {
  const items = rows.map(
    (r) => `  <Listing>
    <Portals><Portal>${portal === "bayut" ? "Bayut" : "dubizzle"}</Portal></Portals>
    <Property_Ref_No>${xml(ref(r.slug))}</Property_Ref_No>
    <Permit_Number>${xml(r.permit)}</Permit_Number>
    <Property_Status>live</Property_Status>
    <Property_purpose>${r.listing === "rent" ? "Rent" : "Buy"}</Property_purpose>
    <Property_Type>${DG_TYPE[r.type]}</Property_Type>
    <Off_plan>${r.status === "offPlan" ? "Yes" : "No"}</Off_plan>
    ${r.handover ? `<Completion_Date>${r.handover}</Completion_Date>` : ""}
    <City>Dubai</City>
    <Locality>${xml(r.communities?.name)}</Locality>
    <Tower_Name>${xml(r.projects?.name ?? "")}</Tower_Name>
    <Property_Title>${cdata(r.title.en)}</Property_Title>
    ${r.title.ar ? `<Property_Title_AR>${cdata(r.title.ar)}</Property_Title_AR>` : ""}
    <Property_Description>${cdata(r.description.en)}</Property_Description>
    ${r.description.ar ? `<Property_Description_AR>${cdata(r.description.ar)}</Property_Description_AR>` : ""}
    <Property_Size>${r.sqft}</Property_Size>
    <Property_Size_Unit>SQFT</Property_Size_Unit>
    <Bedrooms>${r.beds === 0 ? "Studio" : r.beds}</Bedrooms>
    <Bathrooms>${r.baths}</Bathrooms>
    <Price>${r.price_aed ?? ""}</Price>
    ${r.listing === "rent" ? "<Rent_Frequency>Yearly</Rent_Frequency>" : ""}
    ${r.furnishing ? `<Furnished>${FURNISHED[r.furnishing]}</Furnished>` : ""}
    <Latitude>${r.lat}</Latitude>
    <Longitude>${r.lng}</Longitude>
    <Listing_Agent>${xml(r.agents?.name ?? site.name)}</Listing_Agent>
    <Listing_Agent_Email>${xml(r.agents?.email ?? site.email)}</Listing_Agent_Email>
    <Listing_Agent_Phone>${xml(phone)}</Listing_Agent_Phone>
    <Features>${r.amenities.map((a) => `<Feature>${xml(a)}</Feature>`).join("")}</Features>
    <Images>${r.images.map((i) => `<Image>${xml(absolute(i.src))}</Image>`).join("")}</Images>
    <Web_Url>${xml(listingUrl(r.slug))}</Web_Url>
    <Last_Updated>${stamp(r.updated_at)}</Last_Updated>
  </Listing>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>
<Listings>
${items.join("\n")}
</Listings>
`
}

export async function portalFeed(portal: Portal) {
  const rows = await listings()
  const body = portal === "property-finder" ? propertyFinder(rows) : dubizzleGroup(rows, portal)
  // Drop the blank lines left by optional fields.
  return { xml: body.replace(/\n\s*\n/g, "\n"), count: rows.length }
}
