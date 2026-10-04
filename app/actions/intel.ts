"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import type Anthropic from "@anthropic-ai/sdk"
import { routing } from "@/i18n/routing"
import { localeNames, type Locale } from "@/i18n/locales"
import { aiConfigured, claude, logRun, MODELS, quick, structured, textOf } from "@/lib/ai/client"
import { explainFacts, insightKinds, type InsightKind } from "@/lib/ai/explain"
import { getCommunity, getProjects } from "@/lib/data"
import { buildingsNear, distanceKm, drive, placesNear, type Footprint, type Place } from "@/lib/geo/osm"
import { departures, landmarks, type Departure, type LandmarkKey } from "@/lib/geo/landmarks"
import { matchProperties, type Match, type MatchAnswers } from "@/lib/insights/match"
import { saveLead } from "@/lib/leads"
import { estimateValue } from "@/lib/market/estimate"
import { getMarketModel, getToolProperties } from "@/lib/market/model"
import { rateLimited, verifyHuman } from "@/lib/security"

// Server actions behind the Buildcaps Intelligence tools. Numbers come from our
// own models and free data; Claude (when configured) only explains, translates
// and reads documents. Every action is rate limited per visitor.

const toLocale = (v: string): Locale => (hasLocale(routing.locales, v) ? v : "en")
const TEN_MIN = 10 * 60_000

/** "Explain this in plain words" under any tool result. */
export async function explainInsight(kind: string, facts: unknown, locale: string) {
  if (!insightKinds.includes(kind as InsightKind)) return null
  if (await rateLimited("explain", 30, TEN_MIN)) return null
  return explainFacts(kind as InsightKind, facts, toLocale(locale))
}

/* ── Buildcaps Estimate ─────────────────────────────────────────────── */

export type EstimateResult = {
  low: number
  mid: number
  high: number
  sales: number
  latest: string | null
  basis: "exact" | "anyRooms" | "community"
  confidence: "high" | "medium" | "low" | "indicative"
  pricePerSqft: number
}

export async function estimateAction(input: { community: string; beds: number; sqft: number }): Promise<EstimateResult | null> {
  const parsed = z.object({ community: z.string().max(80), beds: z.number().int().min(0).max(10), sqft: z.number().min(150).max(50_000) }).safeParse(input)
  if (!parsed.success || (await rateLimited("estimate", 40, TEN_MIN))) return null
  const dld = await estimateValue(parsed.data)
  if (dld) return { ...dld, pricePerSqft: Math.round(dld.mid / parsed.data.sqft) }
  // No DLD comparables yet: an indicative range from the community average.
  const c = await getCommunity(parsed.data.community)
  if (!c?.avgPricePerSqft) return null
  const round = (v: number) => Math.round(v / 10_000) * 10_000
  const mid = c.avgPricePerSqft * parsed.data.sqft
  return { low: round(mid * 0.88), mid: round(mid), high: round(mid * 1.12), sales: 0, latest: null, basis: "community", confidence: "indicative", pricePerSqft: c.avgPricePerSqft }
}

/* ── Match Me ───────────────────────────────────────────────────────── */

const answersSchema = z.object({
  goal: z.enum(["live", "invest", "both"]),
  budget: z.number().min(100_000).max(500_000_000),
  type: z.enum(["apartment", "villa", "any"]),
  beds: z.number().int().min(0).max(8),
  timing: z.enum(["ready", "offPlan", "any"]),
  priorities: z.array(z.enum(["yield", "growth", "waterfront", "family", "goldenVisa", "paymentPlan"])).max(6),
})

export async function matchAction(answers: MatchAnswers, localeValue: string): Promise<{ matches: Match[]; notes: Record<string, string> }> {
  const parsed = answersSchema.safeParse(answers)
  const locale = toLocale(localeValue)
  if (!parsed.success || (await rateLimited("match", 20, TEN_MIN))) return { matches: [], notes: {} }
  const [properties, model] = await Promise.all([getToolProperties(locale), getMarketModel()])
  const matches = matchProperties(parsed.data, properties, model)
  const notes: Record<string, string> = {}
  if (aiConfigured && matches.length) {
    try {
      const { value, usage } = await structured<{ picks: { slug: string; why: string }[] }>({
        model: MODELS.fast,
        system: `You explain why each Dubai listing fits a buyer's quiz answers. Write in ${localeNames[locale]}, one sentence (max 25 words) per listing. Use only the facts given; never invent numbers.`,
        messages: [{ role: "user", content: JSON.stringify({ answers: parsed.data, picks: matches.map((m) => ({ slug: m.property.slug, title: m.property.title, priceAed: m.property.priceAed, beds: m.property.beds, type: m.property.type, status: m.property.status, community: m.property.communitySlug, estYield: m.property.estYield, matched: m.reasons })) }) }],
        name: "explain_picks",
        description: "One sentence per listing on why it fits",
        schema: { type: "object", properties: { picks: { type: "array", items: { type: "object", properties: { slug: { type: "string" }, why: { type: "string" } }, required: ["slug", "why"] } } }, required: ["picks"] },
        maxTokens: 1200,
      })
      for (const p of value.picks ?? []) notes[p.slug] = p.why
      await logRun({ agent: "match-me", trigger: "quiz", status: "ok", usage })
    } catch (error) {
      await logRun({ agent: "match-me", trigger: "quiz", status: "error", error: String(error) })
    }
  }
  return { matches, notes }
}

/* ── Buyer Bloc ─────────────────────────────────────────────────────── */

export type BlocState = { status: "idle" | "done" | "error" }

export async function joinBlocAction(_: BlocState, formData: FormData): Promise<BlocState> {
  const parsed = z
    .object({
      project: z.string().regex(/^[a-z0-9-]+$/).max(40),
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(254),
      phone: z.string().trim().max(40).optional(),
      country: z.string().trim().max(80).optional(),
      units: z.coerce.number().int().min(1).max(20),
      budget: z.coerce.number().min(0).max(1e9),
      locale: z.string().max(8),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { status: "error" }
  if ((await rateLimited("bloc", 5, TEN_MIN)) || !(await verifyHuman(formData.get("cf-turnstile-response")))) return { status: "error" }
  const d = parsed.data
  const ok = await saveLead({
    kind: "bloc",
    email: d.email,
    name: d.name,
    phone: d.phone || undefined,
    country: d.country || undefined,
    locale: d.locale,
    interest: d.project,
    message: `Buyer Bloc: ${d.units} unit(s), budget AED ${Math.round(d.budget).toLocaleString("en-GB")}`,
    source: "tools/buyer-bloc",
  })
  return { status: ok ? "done" : "error" }
}

/* ── Promise Ledger: explain my brochure or SPA ─────────────────────── */

export type DocumentAnalysis = {
  summary: string
  promises: { text: string; category: string; due?: string }[]
  clauses: { clause: string; risk: "high" | "medium" | "low"; why: string; ask: string }[]
  questions: string[]
}
export type DocumentState = { status: "idle" | "done" | "error"; reason?: "file" | "busy" | "offline" | "human"; result?: DocumentAnalysis }

const MAX_PDF = 10 * 1024 * 1024

/** Reads a brochure or contract once and forgets it: nothing is stored. */
export async function analyseDocumentAction(_: DocumentState, formData: FormData): Promise<DocumentState> {
  const file = formData.get("file")
  const locale = toLocale(String(formData.get("locale") ?? "en"))
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size === 0 || file.size > MAX_PDF) return { status: "error", reason: "file" }
  if (!aiConfigured) return { status: "error", reason: "offline" }
  if (!(await verifyHuman(formData.get("cf-turnstile-response")))) return { status: "error", reason: "human" }
  if (await rateLimited("document", 3, 60 * 60_000)) return { status: "error", reason: "busy" }
  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64")
    const { value, usage } = await structured<DocumentAnalysis>({
      model: MODELS.chat,
      system: [
        "You help a property buyer understand a Dubai developer brochure or sale and purchase agreement (SPA).",
        `Write everything in ${localeNames[locale]}. Plain words, no legal jargon without an explanation.`,
        "List every concrete promise (handover date, amenities, specifications, payment terms, community features).",
        "Flag clauses that are unusual or one-sided compared with typical Dubai SPAs (for example: open-ended handover extensions, unilateral changes to specifications or area, high late-payment penalties, weak refund rights, broad force majeure). Rate each high, medium or low and give the question to ask.",
        "Quote clause numbers where present. Never invent content that is not in the document. You are not giving legal advice.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } } as Anthropic.DocumentBlockParam,
            { type: "text", text: "Analyse this document." },
          ],
        },
      ],
      name: "document_review",
      description: "The buyer-friendly review of the document",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          promises: { type: "array", items: { type: "object", properties: { text: { type: "string" }, category: { type: "string", enum: ["handover", "amenity", "specification", "payment", "community", "other"] }, due: { type: "string" } }, required: ["text", "category"] } },
          clauses: { type: "array", items: { type: "object", properties: { clause: { type: "string" }, risk: { type: "string", enum: ["high", "medium", "low"] }, why: { type: "string" }, ask: { type: "string" } }, required: ["clause", "risk", "why", "ask"] } },
          questions: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "promises", "clauses", "questions"],
      },
      maxTokens: 6000,
      think: true,
    })
    await logRun({ agent: "promise-ledger", trigger: "document", status: "ok", summary: `${value.promises?.length ?? 0} promises, ${value.clauses?.length ?? 0} clauses`, usage })
    return { status: "done", result: value }
  } catch (error) {
    await logRun({ agent: "promise-ledger", trigger: "document", status: "error", error: String(error) })
    return { status: "error", reason: "busy" }
  }
}

/* ── Family Decision Room ───────────────────────────────────────────── */

/** Translates one chat message into the reader's language. Null when unavailable. */
export async function translateAction(text: string, localeValue: string) {
  const parsed = z.string().trim().min(1).max(1000).safeParse(text)
  if (!parsed.success || !aiConfigured || (await rateLimited("translate", 80, TEN_MIN))) return null
  try {
    const response = await claude().messages.create({
      model: MODELS.fast,
      max_tokens: 800,
      system: `Translate the user's message into ${localeNames[toLocale(localeValue)]}. Output only the translation. Keep names of people, projects, developers and communities as written. If it is already in that language, return it unchanged.`,
      messages: [{ role: "user", content: parsed.data }],
    })
    return textOf(response) || null
  } catch {
    return null
  }
}

export type FamilyInput = {
  members: { name: string; locale: string; mustHaves: string[]; budget: number | null }[]
  shortlist: { slug: string; title: string; score: number }[]
}

export async function familySummaryAction(input: FamilyInput, localeValue: string): Promise<{ summary: string; suggest: string[] } | null> {
  const locale = toLocale(localeValue)
  if (!aiConfigured || (await rateLimited("family", 10, TEN_MIN))) return null
  const inventory = (await getToolProperties(locale)).filter((p) => p.listing === "sale").slice(0, 60)
  try {
    const { value, usage } = await structured<{ summary: string; suggest: string[] }>({
      model: MODELS.chat,
      system: [
        "You mediate a family choosing a Dubai property together from different countries.",
        `Write in ${localeNames[locale]}. In under 150 words: what everyone agrees on, where they differ, and a fair compromise.`,
        "Suggest up to three listings from the inventory (by slug) that best satisfy everyone. Never invent listings or numbers.",
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify({ ...input, inventory: inventory.map((p) => ({ slug: p.slug, title: p.title, priceAed: p.priceAed, beds: p.beds, type: p.type, status: p.status, community: p.communitySlug })) }).slice(0, 20_000) }],
      name: "family_consensus",
      description: "Consensus summary and suggested listings",
      schema: { type: "object", properties: { summary: { type: "string" }, suggest: { type: "array", items: { type: "string" }, maxItems: 3 } }, required: ["summary", "suggest"] },
      maxTokens: 1500,
    })
    await logRun({ agent: "family-room", trigger: "summary", status: "ok", usage })
    const known = new Set(inventory.map((p) => p.slug))
    return { summary: value.summary, suggest: (value.suggest ?? []).filter((s) => known.has(s)) }
  } catch (error) {
    await logRun({ agent: "family-room", trigger: "summary", status: "error", error: String(error) })
    return null
  }
}

/* ── Day in Your Life ───────────────────────────────────────────────── */

export type Commute = { key: LandmarkKey; minutes: number; rushMinutes: number; km: number; source: "osrm" | "estimate" }
export type DayResult = { commutes: Commute[]; places: Place[]; story: string | null }

export async function dayInLifeAction(input: { lat: number; lng: number; area: string; destinations: LandmarkKey[]; departure: Departure; household: { adults: number; kids: number } }, localeValue: string): Promise<DayResult | null> {
  const locale = toLocale(localeValue)
  const parsed = z
    .object({
      lat: z.number().min(24).max(26),
      lng: z.number().min(54).max(56.5),
      area: z.string().max(80),
      destinations: z.array(z.enum(Object.keys(landmarks) as [LandmarkKey, ...LandmarkKey[]])).min(1).max(4),
      departure: z.enum(Object.keys(departures) as [Departure, ...Departure[]]),
      household: z.object({ adults: z.number().int().min(1).max(8), kids: z.number().int().min(0).max(8) }),
    })
    .safeParse(input)
  if (!parsed.success || (await rateLimited("day", 15, TEN_MIN))) return null
  const d = parsed.data
  const from = { lat: d.lat, lng: d.lng }
  const factor = departures[d.departure]
  const [commutes, places] = await Promise.all([
    Promise.all(
      d.destinations.map(async (key) => {
        const r = await drive(from, landmarks[key])
        return { key, minutes: Math.round(r.minutes), rushMinutes: Math.round(r.minutes * factor), km: Math.round(r.km * 10) / 10, source: r.source }
      }),
    ),
    placesNear(from, locale),
  ])

  let story: string | null = null
  if (aiConfigured) {
    const nearest = (kind: Place["kind"]) => places.find((p) => p.kind === kind && p.name)
    // Short distances read better in metres ("150 m") than as "0 km".
    const walk = (km: number) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${Math.round(km * 10) / 10} km`)
    const facts = {
      area: d.area,
      leaveAt: d.departure,
      household: d.household,
      commutes: commutes.map((c) => ({ to: c.key, rushHourMinutes: c.rushMinutes, km: c.km })),
      nearby: Object.fromEntries((["cafe", "supermarket", "gym", "park", "school", "worship", "metro", "beach"] as const).map((k) => [k, nearest(k) ? { name: nearest(k)!.name, distance: walk(nearest(k)!.km) } : null])),
      counts: Object.fromEntries((["cafe", "restaurant", "supermarket", "gym", "park", "school", "health"] as const).map((k) => [k, places.filter((p) => p.kind === k && p.km <= 1.5).length])),
    }
    try {
      const response = await claude().messages.create({
        model: MODELS.chat,
        max_tokens: 700,
        ...quick(MODELS.chat),
        system: `Narrate a typical weekday for this household living in ${d.area}, Dubai, in ${localeNames[locale]}, second person, warm but factual, 120 to 170 words, plain text. Use only the places, distances and times in the facts; never invent names or numbers. It will be read aloud.`,
        messages: [{ role: "user", content: JSON.stringify(facts) }],
      })
      story = textOf(response) || null
      await logRun({ agent: "day-in-your-life", trigger: "narrate", status: "ok", usage: response.usage })
    } catch (error) {
      await logRun({ agent: "day-in-your-life", trigger: "narrate", status: "error", error: String(error) })
    }
  }
  return { commutes, places: places.slice(0, 250), story }
}

/* ── Future Skyline View ────────────────────────────────────────────── */

export type Announced = { slug: string; name: string; lat: number; lng: number; height: number; handoverYear: number }
export type SkylineData = { buildings: Footprint[]; announced: Announced[] }

export async function skylineAction(input: { lat: number; lng: number; exclude?: string }): Promise<SkylineData | null> {
  const parsed = z.object({ lat: z.number().min(24).max(26), lng: z.number().min(54).max(56.5), exclude: z.string().max(80).optional() }).safeParse(input)
  if (!parsed.success || (await rateLimited("skyline", 20, TEN_MIN))) return null
  const at = { lat: parsed.data.lat, lng: parsed.data.lng }
  const [buildings, projects] = await Promise.all([buildingsNear(at, 700), getProjects()])
  const announced = projects
    .filter((p) => p.slug !== parsed.data.exclude && distanceKm(at, p.geo) <= 1.5)
    .map((p) => ({ slug: p.slug, name: p.name, lat: p.geo.lat, lng: p.geo.lng, height: (p.floors ?? 30) * 3.4, handoverYear: new Date(p.handover).getUTCFullYear() }))
  return { buildings, announced }
}
