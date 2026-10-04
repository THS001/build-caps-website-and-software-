"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { localeNames, type Locale } from "@/i18n/locales"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"
import { getCommunities } from "@/lib/data"
import type { PropertyFilters } from "@/lib/data/types"
import { filtersToParams, parseQuery } from "@/lib/search/parse-query"
import { commuteTargets } from "@/lib/search/lifestyle"
import { rateLimited } from "@/lib/security"

type ParsedFilters = {
  status?: "offPlan" | "ready"
  type?: "apartment" | "villa" | "townhouse" | "penthouse" | "duplex"
  community?: string
  min_beds?: number
  min_price_aed?: number
  max_price_aed?: number
  handover_year?: number
  golden_visa?: boolean
  post_handover_plan?: boolean
  commute_to?: (typeof commuteTargets)[number]
  max_commute_minutes?: number
  near_school?: boolean
  near_metro?: boolean
  max_monthly_cost_aed?: number
  sort?: PropertyFilters["sort"]
}

/**
 * Ask Buildcaps: turns a request in any of the 10 languages into listing filters
 * (Claude tool-use), returned as the /properties query string. Falls back to the
 * rule-based English parser without an API key or on error.
 */
export async function askBuildcaps(text: string, localeValue: string): Promise<string> {
  const query = z.string().trim().min(1).max(300).safeParse(text)
  const locale: Locale = hasLocale(routing.locales, localeValue) ? localeValue : "en"
  if (!query.success) return ""
  const communities = await getCommunities()
  const fallback = () => {
    const params = filtersToParams(parseQuery(query.data, communities))
    params.set("q", query.data)
    return params.toString()
  }
  if (!aiConfigured || (await rateLimited("ask", 20, 10 * 60_000))) return fallback()

  try {
    const { value, usage } = await structured<ParsedFilters>({
      model: MODELS.chat,
      system: [
        "You convert a property search request for Dubai into structured filters. The request may be in any language.",
        `Visitor language: ${localeNames[locale]}. Prices are in AED: convert other currencies at USD 1 = AED 3.6725, and treat '2M' as 2,000,000.`,
        `Communities (use the slug): ${communities.map((c) => `${c.slug} = ${c.name}`).join("; ")}.`,
        "Only set a filter the request clearly implies. 'Studio' = min_beds 0. 'Under X' = max_price_aed. 'Best yield' or 'rental income' = sort yieldDesc. 'Golden Visa' = golden_visa true.",
        "Lifestyle: any travel-time limit to a place sets commute_to and max_commute_minutes, e.g. '25 minutes to DIFC' = difc + 25, '30 min to the airport' = dxb + 30 (Media/Internet City = internetCity, Expo = expoCity). 'Near a school' = near_school. 'Walk to the metro' = near_metro. A monthly budget ('under 15k a month', 'monthly payments below X') = max_monthly_cost_aed.",
      ].join("\n"),
      messages: [{ role: "user", content: query.data }],
      name: "set_filters",
      description: "Set the listing filters that match the request",
      schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["offPlan", "ready"] },
          type: { type: "string", enum: ["apartment", "villa", "townhouse", "penthouse", "duplex"] },
          ...(communities.length ? { community: { type: "string", enum: communities.map((c) => c.slug) } } : {}),
          min_beds: { type: "integer", minimum: 0, maximum: 10 },
          min_price_aed: { type: "number" },
          max_price_aed: { type: "number" },
          handover_year: { type: "integer", minimum: 2025, maximum: 2040 },
          golden_visa: { type: "boolean" },
          post_handover_plan: { type: "boolean" },
          commute_to: { type: "string", enum: [...commuteTargets], description: "Place the buyer must reach: difc, downtown, businessBay, internetCity (Media and Internet City), marina, dxb (Dubai International Airport), healthcareCity, siliconOasis, expoCity, abuDhabi" },
          max_commute_minutes: { type: "integer", minimum: 5, maximum: 120, description: "Most minutes they accept to drive to commute_to" },
          near_school: { type: "boolean" },
          near_metro: { type: "boolean" },
          max_monthly_cost_aed: { type: "number" },
          sort: { type: "string", enum: ["featured", "priceAsc", "priceDesc", "yieldDesc", "handoverAsc", "newest"] },
        },
      },
      maxTokens: 400,
    })
    const params = filtersToParams({
      status: value.status,
      type: value.type,
      community: value.community,
      minBeds: value.min_beds,
      minPrice: value.min_price_aed,
      maxPrice: value.max_price_aed,
      handoverYear: value.handover_year,
      goldenVisa: value.golden_visa || undefined,
      postHandover: value.post_handover_plan || undefined,
      commuteTo: value.commute_to && value.max_commute_minutes ? value.commute_to : undefined,
      commuteMax: value.commute_to ? value.max_commute_minutes : undefined,
      nearSchool: value.near_school || undefined,
      nearMetro: value.near_metro || undefined,
      maxMonthly: value.max_monthly_cost_aed,
      sort: value.sort,
    })
    params.set("q", query.data)
    await logRun({ agent: "ask-buildcaps", trigger: "search", status: "ok", summary: query.data, output: value, usage })
    return params.toString()
  } catch (error) {
    await logRun({ agent: "ask-buildcaps", trigger: "search", status: "error", error: error instanceof Error ? error.message : String(error) })
    return fallback()
  }
}
