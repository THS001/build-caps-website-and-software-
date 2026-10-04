"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { localeNames, type Locale } from "@/i18n/locales"
import { aiConfigured, claude, logRun, MODELS, quick, structured, textOf } from "@/lib/ai/client"
import { getAgent, getCommunity, getProperty, localize } from "@/lib/data"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { rateLimited } from "@/lib/security"
import { BUDGET_AED_PER_SQFT, moodBudgets, moodStyles, type Moodboard } from "@/lib/insights/moodboard"

// AI on the listing page: the advisor's spoken intro (Advisor Voice Notes) and a
// design direction for the unit (Style Moodboard). Facts come from the listing;
// Claude only writes. Both are rate limited per visitor.

const toLocale = (v: string): Locale => (hasLocale(routing.locales, v) ? v : "en")
const slugSchema = z.string().regex(/^[a-z0-9-]{2,120}$/)

async function listingFacts(slug: string, locale: Locale) {
  const property = await getProperty(slug)
  if (!property) return null
  const [community, agent] = await Promise.all([getCommunity(property.communitySlug), property.agentSlug ? getAgent(property.agentSlug) : Promise.resolve(null)])
  return {
    property,
    agent,
    facts: {
      title: localize(property.title, locale),
      description: localize(property.description, locale).slice(0, 1500),
      listing: property.listing,
      status: property.status,
      type: property.type,
      priceAed: property.priceAed,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      handover: property.handover,
      paymentPlan: property.paymentPlan ?? null,
      estimatedGrossYield: property.estYield ?? null,
      furnishing: property.furnishing ?? null,
      amenities: property.amenities,
      community: community ? { name: community.name, lifestyle: localize(community.lifestyle, locale), schools: localize(community.schools, locale), transport: localize(community.transport, locale), waterfront: community.waterfront } : null,
    },
  }
}

/* ── Advisor Voice Notes ──────────────────────────────────────────────── */

export type VoiceNote = { script: string; advisor: string | null }

/**
 * A 60 to 90 second spoken intro to the listing from its advisor, in the
 * visitor's language. Cached per listing and language until the listing changes.
 */
export async function listingIntroAction(slugValue: string, localeValue: string): Promise<VoiceNote | null> {
  const slug = slugSchema.safeParse(slugValue)
  const locale = toLocale(localeValue)
  if (!slug.success || !aiConfigured) return null
  const loaded = await listingFacts(slug.data, locale)
  if (!loaded) return null
  const advisor = loaded.agent?.name ?? null

  let updatedAt: string | null = null
  if (adminConfigured) {
    const supabase = adminClient()
    const [{ data: row }, { data: cached }] = await Promise.all([
      supabase.from("properties").select("updated_at").eq("slug", slug.data).maybeSingle(),
      supabase.from("listing_intros").select("script, property_updated_at").eq("property_slug", slug.data).eq("locale", locale).maybeSingle(),
    ])
    updatedAt = row?.updated_at ?? null
    if (cached && updatedAt && new Date(cached.property_updated_at).getTime() === new Date(updatedAt).getTime()) return { script: cached.script, advisor }
  }
  if (await rateLimited("voice", 10, 10 * 60_000)) return null

  try {
    const response = await claude().messages.create({
      model: MODELS.chat,
      max_tokens: 900,
      ...quick(MODELS.chat),
      system: [
        `You are ${advisor ?? "a Buildcaps property advisor"}, a property advisor at Buildcaps in Dubai, recording a short voice note that introduces a listing to a prospective buyer.`,
        `Write it in ${localeNames[locale]}, first person, warm and natural, 130 to 180 words (60 to 90 seconds spoken).`,
        "Use only the facts given; never invent views, finishes, prices or returns. Say numbers the way people speak them, round where natural, and call yields estimates.",
        "Plain text only: no headings, lists, emojis or stage directions. End by inviting them to book a viewing or a call.",
      ].join(" "),
      messages: [{ role: "user", content: JSON.stringify(loaded.facts) }],
    })
    const script = textOf(response).slice(0, 3000)
    await logRun({ agent: "voice-notes", trigger: "listing", status: "ok", summary: `${slug.data} (${locale})`, usage: response.usage })
    if (!script) return null
    if (adminConfigured && updatedAt) {
      await adminClient()
        .from("listing_intros")
        .upsert({ property_slug: slug.data, locale, agent_slug: loaded.agent?.slug ?? null, script, property_updated_at: updatedAt })
    }
    return { script, advisor }
  } catch (error) {
    await logRun({ agent: "voice-notes", trigger: "listing", status: "error", error: String(error) })
    return null
  }
}

/* ── Style Moodboard ──────────────────────────────────────────────────── */

const moodSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "A short evocative name for the direction" },
    story: { type: "string", description: "Two or three sentences on the feel and why it suits this home" },
    palette: {
      type: "array",
      minItems: 5,
      maxItems: 6,
      items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string", description: "#RRGGBB" }, use: { type: "string", description: "Where it goes (walls, joinery, textiles, accents)" } }, required: ["name", "hex", "use"] },
    },
    materials: { type: "array", maxItems: 6, items: { type: "string" } },
    rooms: { type: "array", maxItems: 5, items: { type: "object", properties: { room: { type: "string" }, idea: { type: "string" } }, required: ["room", "idea"] } },
    pieces: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: { type: "object", properties: { item: { type: "string" }, why: { type: "string" }, priceAed: { type: "number", description: "Typical Dubai retail price in AED for one piece at this budget level" } }, required: ["item", "why", "priceAed"] },
    },
    tips: { type: "array", maxItems: 4, items: { type: "string" }, description: "Practical tips for Dubai (heat, light, sand, rental appeal)" },
  },
  required: ["name", "story", "palette", "materials", "rooms", "pieces", "tips"],
} as const

/** A design direction for the unit: palette, materials, room ideas and an indicative furniture list. */
export async function moodboardAction(input: { slug: string; style: string; budget: string; purpose: "live" | "rent" }, localeValue: string): Promise<Moodboard | null> {
  const parsed = z
    .object({ slug: slugSchema, style: z.enum(moodStyles), budget: z.enum(moodBudgets), purpose: z.enum(["live", "rent"]) })
    .safeParse(input)
  const locale = toLocale(localeValue)
  if (!parsed.success || !aiConfigured || (await rateLimited("moodboard", 6, 10 * 60_000))) return null
  const loaded = await listingFacts(parsed.data.slug, locale)
  if (!loaded) return null
  const [low, high] = BUDGET_AED_PER_SQFT[parsed.data.budget]
  const { sqft } = loaded.property

  try {
    const { value, usage } = await structured<Omit<Moodboard, "totalAed">>({
      model: MODELS.chat,
      system: [
        "You are an interior designer in Dubai proposing a furnishing direction for a specific home. Write in " + localeNames[locale] + ".",
        `Style: ${parsed.data.style}. The owner will ${parsed.data.purpose === "rent" ? "rent it out, so favour durable, neutral, photogenic choices tenants like" : "live in it"}.`,
        `Furnishing budget is roughly AED ${low} to ${high} per square foot of the ${sqft} sq ft, i.e. about AED ${Math.round((low * sqft) / 1000) * 1000} to ${Math.round((high * sqft) / 1000) * 1000} in total; the furniture list should sit inside it.`,
        "Use the listing facts for room count, size and setting. Do not name specific shops or brands. Prices are indicative.",
      ].join(" "),
      messages: [{ role: "user", content: JSON.stringify(loaded.facts) }],
      name: "moodboard",
      description: "The design direction",
      schema: moodSchema as never,
      maxTokens: 3000,
    })
    await logRun({ agent: "style-moodboard", trigger: "listing", status: "ok", summary: `${parsed.data.slug} ${parsed.data.style}`, usage })
    const hex = /^#[0-9a-f]{6}$/i
    const pieces = (value.pieces ?? []).slice(0, 10).map((p) => ({ item: String(p.item), why: String(p.why), priceAed: Math.max(0, Math.round(Number(p.priceAed) / 50) * 50) }))
    return {
      ...value,
      palette: (value.palette ?? []).filter((c) => hex.test(c.hex)).slice(0, 6),
      pieces,
      totalAed: pieces.reduce((s, p) => s + p.priceAed, 0),
      tips: (value.tips ?? []).slice(0, 4),
    }
  } catch (error) {
    await logRun({ agent: "style-moodboard", trigger: "listing", status: "error", error: String(error) })
    return null
  }
}
