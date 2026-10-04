import "server-only"
import { locales, localeNames } from "@/i18n/locales"
import { adminClient } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"

// Listing Ops: a developer brochure (PDF) becomes a draft listing with copy in all
// 10 languages, SEO text and highlight chips. It is saved unpublished with a
// placeholder permit, so it can't go live until an admin adds the real DLD permit.
// Every promise in the brochure is also filed in the Promise Ledger, unpublished,
// so the team can track whether it is delivered.

export const PENDING_PERMIT = "PENDING-PERMIT"

type Extracted = {
  slug: string
  project_name: string
  developer_name: string
  community_hint: string
  status: "offPlan" | "ready"
  type: "apartment" | "villa" | "townhouse" | "penthouse" | "duplex"
  beds: number
  baths: number
  sqft: number
  price_aed: number | null
  handover: string | null
  payment_plan: { onBooking: number; duringConstruction: number; onHandover: number; postHandover: number } | null
  amenities: string[]
  keywords: string[]
  title: Record<string, string>
  description: Record<string, string>
  missing: string[]
  promises: { text: string; category: "handover" | "amenity" | "specification" | "payment" | "community" | "other"; due: string | null }[]
}

export async function draftListingFromBrochure(pdfBase64: string, options: { communities: { slug: string; name: string }[]; developers: { slug: string; name: string }[]; note?: string }) {
  if (!aiConfigured) throw new Error("Brochure import needs ANTHROPIC_API_KEY")
  // Every listing belongs to a community; check before paying for the read.
  if (!options.communities.length) throw new Error("Add at least one community first (Admin → Communities): every listing belongs to one.")
  const { value, usage } = await structured<Extracted>({
    model: MODELS.chat,
    system: [
      "You read Dubai off-plan and resale brochures and draft one listing for Buildcaps (pick the most representative unit if there are several).",
      "Use only facts in the brochure. Unknown numbers = null; list every missing fact in `missing` (always include the DLD advertising permit).",
      "Write `title` (under 70 characters) and `description` (2–3 sentences, outcome-led, no hype, no guaranteed returns) in all 10 languages: " +
        locales.map((l) => `${l} = ${localeNames[l]}`).join(", ") +
        ". Keep project, developer and community names in Latin script.",
      "amenities: choose from pool, gym, concierge, parking, kidsPlay, security, privatePool, garden, maidsRoom, golfView, privateBeach.",
      "promises: every concrete commitment in English (handover date, amenities, specifications, payment terms, community features), with a due date (YYYY-MM-DD) when stated.",
      "keywords: choose from seaView, highFloor, cornerUnit, skylineView, postHandoverPlan, golfView, privatePool, furnished, highYield, fountainView, tenanted, goldenVisaEligible, beachfront, canalView, nearMetro, garden, familyHome, terrace, parkView, creekView.",
      `Known communities: ${options.communities.map((c) => `${c.slug} (${c.name})`).join(", ")}. Known developers: ${options.developers.map((d) => `${d.slug} (${d.name})`).join(", ")}.`,
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: options.note ? `Advisor note: ${options.note}` : "Draft the listing." },
        ],
      },
    ],
    name: "draft_listing",
    description: "A draft Buildcaps listing extracted from the brochure",
    schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "lowercase-hyphenated URL slug" },
        project_name: { type: "string" },
        developer_name: { type: "string" },
        community_hint: { type: "string", description: "Community slug from the known list, or the name in the brochure" },
        status: { type: "string", enum: ["offPlan", "ready"] },
        type: { type: "string", enum: ["apartment", "villa", "townhouse", "penthouse", "duplex"] },
        beds: { type: "integer" },
        baths: { type: "integer" },
        sqft: { type: "number" },
        price_aed: { type: ["number", "null"] },
        handover: { type: ["string", "null"], description: "YYYY-MM-DD (end of quarter if only a quarter is given)" },
        payment_plan: {
          type: ["object", "null"],
          properties: { onBooking: { type: "number" }, duringConstruction: { type: "number" }, onHandover: { type: "number" }, postHandover: { type: "number" } },
        },
        amenities: { type: "array", items: { type: "string" } },
        keywords: { type: "array", items: { type: "string" } },
        title: { type: "object", properties: Object.fromEntries(locales.map((l) => [l, { type: "string" }])), required: [...locales] },
        description: { type: "object", properties: Object.fromEntries(locales.map((l) => [l, { type: "string" }])), required: [...locales] },
        missing: { type: "array", items: { type: "string" } },
        promises: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, category: { type: "string", enum: ["handover", "amenity", "specification", "payment", "community", "other"] }, due: { type: ["string", "null"] } },
            required: ["text", "category"],
          },
        },
      },
      required: ["slug", "project_name", "status", "type", "beds", "baths", "sqft", "title", "description", "missing", "promises"],
    },
    maxTokens: 8000,
  })

  const community = options.communities.find((c) => c.slug === value.community_hint || c.name.toLowerCase() === value.community_hint?.toLowerCase())
  const developer = options.developers.find((d) => d.name.toLowerCase() === value.developer_name?.toLowerCase())
  const slug = `${value.slug}-${Date.now().toString(36).slice(-4)}`.replace(/[^a-z0-9-]/g, "-")

  const { data, error } = await adminClient()
    .from("properties")
    .insert({
      slug,
      title: value.title,
      description: value.description,
      status: value.status,
      listing: "sale",
      type: value.type,
      community_slug: community?.slug ?? options.communities[0]?.slug,
      developer_slug: developer?.slug ?? null,
      price_aed: value.price_aed,
      beds: value.beds,
      baths: value.baths,
      sqft: Math.max(1, Math.round(value.sqft || 1)),
      handover: value.status === "offPlan" ? value.handover : null,
      payment_plan: value.payment_plan,
      amenities: value.amenities ?? [],
      keywords: value.keywords ?? [],
      lat: 25.2,
      lng: 55.27,
      permit: PENDING_PERMIT,
      published: false,
      seo: { importedFrom: "brochure", missing: value.missing, community: community ? null : value.community_hint },
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)

  if (developer && value.promises?.length) {
    const source = `Brochure: ${value.project_name} (imported ${new Date().toISOString().slice(0, 10)})`
    await adminClient()
      .from("developer_promises")
      .insert(value.promises.slice(0, 40).map((p) => ({ developer_slug: developer.slug, category: p.category, promise: { en: p.text.slice(0, 500) }, due: /^\d{4}-\d{2}-\d{2}$/.test(p.due ?? "") ? p.due : null, source, status: "pending", published: false })))
  }

  await logRun({ agent: "listing-ops", trigger: "brochure", status: "ok", summary: `${value.project_name} → ${slug}`, output: { missing: value.missing }, usage })
  return { id: data.id as string, missing: value.missing, communityMatched: Boolean(community), promises: value.promises?.length ?? 0 }
}
