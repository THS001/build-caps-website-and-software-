import "server-only"
import { localeNames, type Locale } from "@/i18n/locales"
import { aiConfigured, claude, logRun, MODELS, quick, textOf } from "@/lib/ai/client"

// Plain-language explanations for the Buildcaps Intelligence tools. The numbers
// come from our own models; Claude only explains them, in the visitor's language.

export const insightKinds = ["estimate", "wealthTwin", "regret", "portfolio", "ghostTenant", "handover", "dataRoom", "futureView", "match"] as const
export type InsightKind = (typeof insightKinds)[number]

const focus: Record<InsightKind, string> = {
  estimate: "A value range from comparable Dubai Land Department sales. Explain what the range means, how many sales it rests on and what could move the real price (view, floor, condition).",
  wealthTwin: "A Monte Carlo comparison of net worth: buying a Dubai unit versus keeping the money invested at home, in the buyer's home currency. Explain the median outcome, the spread (10th to 90th percentile) and the chance Dubai comes out ahead, and which assumption matters most.",
  regret: "A counterfactual ('had you bought in year X') and a regret probability for options at the same budget. Explain which option is least likely to be regretted and why, without promising returns.",
  portfolio: "A suggested split of a budget across several Dubai units. Explain the balance between rental income and growth, the diversification and the main risk.",
  ghostTenant: "A simulated market of tenants bidding on a unit: asking rent versus days empty, long-let versus short-let, and the earliest sensible exit year. Explain the trade-off and a sensible asking rent.",
  handover: "A model estimate of the chance an off-plan project hands over on time, from construction progress versus schedule, escrow and the developer's record. Explain the main factors and what the buyer should check.",
  dataRoom: "Community price and transaction statistics from Dubai Land Department data. Summarise the trend and what it means for a buyer.",
  futureView: "A 3D view analysis: how open the view is today and once announced towers are built, plus direct-sun hours. Explain the view risk and the sun exposure.",
  match: "Listings matched to a buyer's quiz answers. Explain in one or two sentences per listing why it fits.",
}

/** One short paragraph in the visitor's language, or null without an API key or on error. */
export async function explainFacts(kind: InsightKind, facts: unknown, locale: Locale) {
  if (!aiConfigured) return null
  try {
    const response = await claude().messages.create({
      model: MODELS.chat,
      max_tokens: 600,
      ...quick(MODELS.chat),
      system: [
        "You explain a Buildcaps Intelligence result to a property buyer.",
        `Write in ${localeNames[locale]}. 90 to 140 words, plain text, no headings, no markdown.`,
        "Use only the figures in the JSON facts; never invent numbers or promise returns. Name the single most important uncertainty.",
        "Do not add a disclaimer: the page already shows one.",
        focus[kind],
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify(facts).slice(0, 8000) }],
    })
    await logRun({ agent: "insight-explainer", trigger: kind, status: "ok", usage: response.usage })
    return textOf(response) || null
  } catch (error) {
    await logRun({ agent: "insight-explainer", trigger: kind, status: "error", error: String(error) })
    return null
  }
}
