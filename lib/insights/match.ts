import type { CommunityModel, ToolProperty } from "./types"

// Match Me: scores every listing against the quiz answers and keeps the reasons,
// so each pick says why it was chosen.

export type MatchAnswers = {
  goal: "live" | "invest" | "both"
  budget: number
  type: "apartment" | "villa" | "any"
  beds: number
  timing: "ready" | "offPlan" | "any"
  priorities: ("yield" | "growth" | "waterfront" | "family" | "goldenVisa" | "paymentPlan")[]
}

export type MatchReason = "budget" | "type" | "beds" | "timing" | "yield" | "growth" | "waterfront" | "family" | "goldenVisa" | "paymentPlan"
export type Match = { property: ToolProperty; score: number; reasons: MatchReason[] }

const VILLA_TYPES = new Set(["villa", "townhouse"])

export function matchProperties(answers: MatchAnswers, properties: ToolProperty[], model: CommunityModel[], limit = 6): Match[] {
  const communities = new Map(model.map((m) => [m.slug, m]))
  const scored: Match[] = []
  for (const p of properties) {
    if (p.listing !== "sale" || !p.priceAed || p.priceAed > answers.budget * 1.05) continue
    const c = communities.get(p.communitySlug)
    const reasons: MatchReason[] = []
    let score = 0
    const fit = p.priceAed / answers.budget
    score += fit >= 0.6 ? 15 : fit * 20
    if (fit >= 0.6 && fit <= 1) reasons.push("budget")

    const isVilla = VILLA_TYPES.has(p.type)
    if (answers.type === "any") score += 8
    else if ((answers.type === "villa") === isVilla) {
      score += 20
      reasons.push("type")
    } else score -= 15

    if (p.beds >= answers.beds) {
      score += p.beds === answers.beds ? 18 : 12
      reasons.push("beds")
    } else score -= 12 * (answers.beds - p.beds)

    if (answers.timing === "any") score += 6
    else if (answers.timing === p.status) {
      score += 14
      reasons.push("timing")
    } else score -= 10

    const yieldNow = p.estYield ?? c?.grossYield ?? 0
    const investWeight = answers.goal === "live" ? 0.5 : 1
    for (const priority of answers.priorities) {
      if (priority === "yield" && yieldNow >= 0.06) {
        score += 14 * investWeight + (yieldNow - 0.06) * 300
        reasons.push("yield")
      }
      if (priority === "growth" && c && c.growth >= 0.04) {
        score += 12 * investWeight
        reasons.push("growth")
      }
      if (priority === "waterfront" && c?.waterfront) {
        score += 12
        reasons.push("waterfront")
      }
      if (priority === "family" && (p.beds >= 3 || isVilla)) {
        score += answers.goal === "invest" ? 6 : 14
        reasons.push("family")
      }
      if (priority === "goldenVisa" && p.priceAed >= 2_000_000) {
        score += 14
        reasons.push("goldenVisa")
      }
      if (priority === "paymentPlan" && p.postHandover) {
        score += 12
        reasons.push("paymentPlan")
      }
    }
    if (answers.goal !== "live") score += yieldNow * 60
    scored.push({ property: p, score, reasons })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}
