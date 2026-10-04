import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import type { Locale } from "@/i18n/locales"
import { loadMessages } from "@/i18n/messages"
import { getCommunities, getNameMaps, getProperties, getProperty, localize, isGoldenVisaEligible } from "@/lib/data"
import type { PropertyFilters } from "@/lib/data/types"
import { buyingCosts, maxLtv, monthlyPayment } from "@/lib/calc"
import { availableSlots, bookableAdvisors, candidatesFor } from "@/lib/booking/availability"
import { workingDays } from "@/lib/booking/slots"
import { localizedPath } from "@/lib/seo"
import { site, whatsappUrl } from "@/lib/site"
import { commuteTargets, monthlyCost, rushMinutes } from "@/lib/search/lifestyle"

// One tool registry for every assistant: the on-site Concierge, the MCP connector
// (Claude, ChatGPT) and the internal agents. Results are plain JSON.

export type ToolContext = { locale: Locale }
type ToolDef = Anthropic.Tool & { run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown> }

const base = () => process.env.NEXT_PUBLIC_SITE_URL ?? site.url
const url = (path: string, locale: Locale) => new URL(localizedPath(path, locale), base()).toString()

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined)
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined)

export const tools: ToolDef[] = [
  {
    name: "search_properties",
    description:
      "Search Buildcaps listings in Dubai. All prices are in AED. Use for any request to find, compare or recommend properties. Returns up to `limit` matches with links.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["offPlan", "ready"] },
        type: { type: "string", enum: ["apartment", "villa", "townhouse", "penthouse", "duplex"] },
        community: { type: "string", description: "Community slug from list_communities, e.g. dubai-marina" },
        min_beds: { type: "number", description: "0 = studio" },
        min_price_aed: { type: "number" },
        max_price_aed: { type: "number" },
        handover_year: { type: "number" },
        golden_visa: { type: "boolean", description: "Only properties priced AED 2M or more" },
        post_handover_plan: { type: "boolean" },
        commute_to: { type: "string", enum: [...commuteTargets], description: "Destination for a rush-hour commute limit (difc, downtown, businessBay, internetCity, marina, dxb airport, healthcareCity, siliconOasis, expoCity, abuDhabi)" },
        max_commute_minutes: { type: "number", description: "Maximum drive in minutes to commute_to, leaving at 08:00 on a weekday" },
        near_school: { type: "boolean", description: "A school within 1.5 km" },
        near_metro: { type: "boolean", description: "A metro station within 1 km" },
        max_monthly_cost_aed: { type: "number", description: "All-in monthly cost: mortgage (or rent) plus service charge and utilities" },
        sort: { type: "string", enum: ["featured", "priceAsc", "priceDesc", "yieldDesc", "handoverAsc", "newest"] },
        limit: { type: "number", description: "Default 5, max 10" },
      },
    },
    async run(i, { locale }) {
      const filters: PropertyFilters = {
        status: str(i.status) as PropertyFilters["status"],
        type: str(i.type) as PropertyFilters["type"],
        community: str(i.community),
        minBeds: num(i.min_beds),
        minPrice: num(i.min_price_aed),
        maxPrice: num(i.max_price_aed),
        handoverYear: num(i.handover_year),
        goldenVisa: i.golden_visa === true || undefined,
        postHandover: i.post_handover_plan === true || undefined,
        commuteTo: (commuteTargets as readonly string[]).includes(str(i.commute_to) ?? "") ? (str(i.commute_to) as PropertyFilters["commuteTo"]) : undefined,
        commuteMax: num(i.max_commute_minutes),
        nearSchool: i.near_school === true || undefined,
        nearMetro: i.near_metro === true || undefined,
        maxMonthly: num(i.max_monthly_cost_aed),
        sort: str(i.sort) as PropertyFilters["sort"],
      }
      const [list, names] = await Promise.all([getProperties(filters), getNameMaps()])
      return {
        total: list.length,
        results: list.slice(0, Math.min(10, num(i.limit) ?? 5)).map((p) => ({
          slug: p.slug,
          title: localize(p.title, locale),
          price_aed: p.priceAed,
          status: p.status,
          type: p.type,
          beds: p.beds,
          baths: p.baths,
          size_sqft: p.sqft,
          community: names.communities[p.communitySlug],
          handover: p.handover,
          est_gross_yield: p.estYield ?? null,
          monthly_cost_aed: monthlyCost(p),
          ...(filters.commuteTo ? { rush_hour_minutes_to_destination: rushMinutes(p, filters.commuteTo) } : {}),
          golden_visa_eligible: isGoldenVisaEligible(p),
          permit: p.permit,
          url: url(`/properties/${p.slug}`, locale),
        })),
      }
    },
  },
  {
    name: "get_property",
    description: "Full details of one listing: description, payment plan, costs, permit and link.",
    input_schema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    async run(i, { locale }) {
      const p = await getProperty(String(i.slug))
      if (!p) return { error: "Not found" }
      const names = await getNameMaps()
      return {
        slug: p.slug,
        title: localize(p.title, locale),
        description: localize(p.description, locale),
        price_aed: p.priceAed,
        status: p.status,
        type: p.type,
        beds: p.beds,
        baths: p.baths,
        size_sqft: p.sqft,
        community: names.communities[p.communitySlug],
        developer: names.developers[p.developerSlug] ?? null,
        handover: p.handover,
        payment_plan_percent: p.paymentPlan ?? null,
        est_gross_yield: p.estYield ?? null,
        service_charge_aed_per_sqft: p.serviceChargePerSqft ?? null,
        amenities: p.amenities,
        highlights: p.keywords,
        dld_permit: p.permit,
        url: url(`/properties/${p.slug}`, locale),
      }
    },
  },
  {
    name: "list_communities",
    description: "Dubai communities Buildcaps covers, with average price per sq ft (AED), estimated gross yield and 12-month price change.",
    input_schema: { type: "object", properties: {} },
    async run(_i, { locale }) {
      return (await getCommunities()).map((c) => ({
        slug: c.slug,
        name: c.name,
        summary: localize(c.summary, locale),
        avg_price_aed_per_sqft: c.avgPricePerSqft,
        est_gross_yield: c.estYield,
        price_change_12m: c.priceChange12m,
        waterfront: c.waterfront,
        url: url(`/communities/${c.slug}`, locale),
      }))
    },
  },
  {
    name: "buying_costs",
    description: "Typical one-off costs of buying in Dubai: 4% DLD fee, registration, agency and mortgage fees. Estimates.",
    input_schema: {
      type: "object",
      properties: {
        price_aed: { type: "number" },
        off_plan: { type: "boolean" },
        resale_via_agent: { type: "boolean" },
        loan_aed: { type: "number", description: "0 if paying cash" },
      },
      required: ["price_aed"],
    },
    async run(i) {
      const items = buyingCosts({ price: num(i.price_aed) ?? 0, offPlan: i.off_plan === true, resale: i.resale_via_agent === true, loan: num(i.loan_aed) ?? 0 })
      return { items, total_aed: Math.round(items.reduce((s, x) => s + x.amount, 0)), note: "Typical figures; they vary by developer and bank." }
    },
  },
  {
    name: "mortgage_payment",
    description: "Monthly mortgage payment and typical maximum loan-to-value for residents and non-residents.",
    input_schema: {
      type: "object",
      properties: {
        price_aed: { type: "number" },
        down_payment_pct: { type: "number" },
        rate_pct: { type: "number", description: "Annual interest rate, default 4.5" },
        years: { type: "number", description: "Default 25" },
        uae_resident: { type: "boolean" },
      },
      required: ["price_aed", "down_payment_pct"],
    },
    async run(i) {
      const price = num(i.price_aed) ?? 0
      const loan = price * (1 - (num(i.down_payment_pct) ?? 40) / 100)
      const monthly = monthlyPayment(loan, num(i.rate_pct) ?? 4.5, num(i.years) ?? 25)
      return { loan_aed: Math.round(loan), monthly_payment_aed: Math.round(monthly), typical_max_ltv: maxLtv(price, i.uae_resident === true) }
    },
  },
  {
    name: "check_availability",
    description: "Free appointment times with an advisor who speaks the visitor's language. Times are ISO-8601 (UTC); Dubai is UTC+4.",
    input_schema: {
      type: "object",
      properties: {
        day: { type: "string", description: "YYYY-MM-DD in Dubai; default the next working day with free slots" },
        advisor: { type: "string", description: "Advisor slug, or omit for the best match" },
      },
    },
    async run(i, { locale }) {
      const advisors = await bookableAdvisors()
      const candidates = candidatesFor(advisors, str(i.advisor) ?? "best", locale)
      const days = str(i.day) ? [String(i.day)] : workingDays(new Date(), 5)
      for (const day of days) {
        const slots = await availableSlots(candidates, day)
        if (slots.length) {
          return {
            day,
            slots: slots.slice(0, 8).map((s) => ({
              start: s.start,
              dubai_time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(s.start)),
              advisor: advisors.find((a) => a.slug === s.advisor)?.name,
            })),
          }
        }
      }
      return { slots: [], note: "No free times in the next few days; offer WhatsApp instead." }
    },
  },
  {
    name: "booking_link",
    description: "A link that opens the Buildcaps booking flow pre-filled. The visitor picks the time and confirms there.",
    input_schema: {
      type: "object",
      properties: {
        purpose: { type: "string", enum: ["strategy", "viewing", "valuation", "mortgage", "goldenVisa"] },
        property_slug: { type: "string" },
        advisor: { type: "string" },
      },
      required: ["purpose"],
    },
    async run(i, { locale }) {
      const params = new URLSearchParams({ purpose: String(i.purpose) })
      if (str(i.property_slug)) params.set("property", String(i.property_slug))
      if (str(i.advisor)) params.set("advisor", String(i.advisor))
      return { url: `${url("/book", locale)}?${params}` }
    },
  },
  {
    name: "whatsapp_handoff",
    description: "Hand the conversation to a human advisor on WhatsApp with a short written brief of what the visitor wants.",
    input_schema: { type: "object", properties: { brief: { type: "string", description: "2–4 lines: goal, budget, timeline, properties of interest" } }, required: ["brief"] },
    async run(i) {
      return { url: whatsappUrl(String(i.brief).slice(0, 900)) }
    },
  },
  {
    name: "faq",
    description: "Buildcaps' verified answers on buying in Dubai: freehold, remote purchase, off-plan safety, costs, Golden Visa, taxes, mortgages, yields, payment plans, resale, permits, management.",
    input_schema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
    async run(i, { locale }) {
      const messages = (await loadMessages(locale)) as { faq: { items: { q: string; a: string }[] } }
      const words = String(i.question).toLowerCase().split(/\W+/).filter((w) => w.length > 3)
      const scored = messages.faq.items
        .map((item) => ({ item, score: words.filter((w) => `${item.q} ${item.a}`.toLowerCase().includes(w)).length }))
        .sort((a, b) => b.score - a.score)
      return scored.slice(0, 3).map((s) => s.item)
    },
  },
]

export const toolByName = new Map(tools.map((t) => [t.name, t]))

/** Tool definitions without the run function, for the Messages API. */
export function toolDefinitions(names?: string[]): Anthropic.Tool[] {
  return tools.filter((t) => !names || names.includes(t.name)).map(({ name, description, input_schema }) => ({ name, description, input_schema }))
}

export async function runTool(name: string, input: unknown, ctx: ToolContext) {
  const tool = toolByName.get(name)
  if (!tool) return { error: `Unknown tool ${name}` }
  try {
    return await tool.run((input ?? {}) as Record<string, unknown>, ctx)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tool failed" }
  }
}
