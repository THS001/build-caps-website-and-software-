import type { CommunityModel, ToolProperty } from "./types"

// Portfolio Architect: splits a budget across listings to balance income and
// growth. Risk uses a simple correlation structure: units in the same community
// move almost together, different property types less so, and the whole Dubai
// market shares one common factor.

export type Goal = "income" | "balanced" | "growth"

export type Holding = { property: ToolProperty; yield: number; growth: number; volatility: number; yearsToIncome: number }

export type Portfolio = {
  holdings: Holding[]
  total: number
  /** Rent over ten years, net of off-plan waiting time, as a yearly rate on cost. */
  incomeYield: number
  growth: number
  risk: number
  /** Weighted unit risk over portfolio risk; above 1 means diversification is working. */
  diversification: number
  /** Net rent in each of the next ten years. */
  incomeByYear: number[]
}

const HORIZON = 10
const COST_RATIO = 0.25
const weights: Record<Goal, { y: number; g: number; risk: number }> = {
  income: { y: 2, g: 0.6, risk: 1.2 },
  balanced: { y: 1, g: 1, risk: 0.9 },
  growth: { y: 0.5, g: 1.6, risk: 0.6 },
}

function holding(p: ToolProperty, model: Map<string, CommunityModel>, now: Date): Holding | null {
  const c = model.get(p.communitySlug)
  if (!c || !p.priceAed) return null
  const handover = p.status === "offPlan" && p.handover ? Math.max(0, (new Date(p.handover).getTime() - now.getTime()) / 31_557_600_000) : 0
  return { property: p, yield: (p.estYield ?? c.grossYield) * (1 - COST_RATIO), growth: c.growth, volatility: c.volatility, yearsToIncome: Math.ceil(handover) }
}

const correlation = (a: Holding, b: Holding) => {
  if (a.property.slug === b.property.slug) return 1
  const sameCommunity = a.property.communitySlug === b.property.communitySlug
  const sameType = (a.property.type === "villa" || a.property.type === "townhouse") === (b.property.type === "villa" || b.property.type === "townhouse")
  return sameCommunity ? (sameType ? 0.9 : 0.75) : sameType ? 0.6 : 0.5
}

export function evaluate(holdings: Holding[]): Portfolio {
  const total = holdings.reduce((s, h) => s + (h.property.priceAed ?? 0), 0)
  const w = holdings.map((h) => (h.property.priceAed ?? 0) / total)
  const incomeByYear = Array.from({ length: HORIZON }, (_, t) => holdings.reduce((s, h) => s + (t >= h.yearsToIncome ? (h.property.priceAed ?? 0) * h.yield : 0), 0))
  let variance = 0
  holdings.forEach((a, i) => holdings.forEach((b, j) => (variance += w[i] * w[j] * a.volatility * b.volatility * correlation(a, b))))
  const risk = Math.sqrt(variance)
  return {
    holdings,
    total,
    incomeYield: incomeByYear.reduce((s, v) => s + v, 0) / HORIZON / total,
    growth: holdings.reduce((s, h, i) => s + w[i] * h.growth, 0),
    risk,
    diversification: holdings.reduce((s, h, i) => s + w[i] * h.volatility, 0) / Math.max(risk, 1e-9),
    incomeByYear,
  }
}

const score = (p: Portfolio, goal: Goal, budget: number) => {
  const k = weights[goal]
  return k.y * p.incomeYield + k.g * p.growth - k.risk * p.risk + 0.02 * (p.total / budget)
}

/**
 * Beam search over combinations of up to `maxUnits` listings within the budget,
 * using at least 60% of it. Returns the best portfolio for each goal.
 */
export function architect(
  properties: ToolProperty[],
  model: CommunityModel[],
  { budget, maxUnits, includeOffPlan }: { budget: number; maxUnits: number; includeOffPlan: boolean },
  now = new Date(),
): Record<Goal, Portfolio | null> {
  const byCommunity = new Map(model.map((m) => [m.slug, m]))
  const pool = properties
    .filter((p) => p.listing === "sale" && p.priceAed && p.priceAed <= budget && (includeOffPlan || p.status === "ready"))
    .map((p) => holding(p, byCommunity, now))
    .filter((h): h is Holding => h !== null)

  const result = {} as Record<Goal, Portfolio | null>
  for (const goal of ["income", "balanced", "growth"] as Goal[]) {
    let beam: Holding[][] = [[]]
    let best: Portfolio | null = null
    for (let size = 1; size <= maxUnits; size++) {
      const next: { set: Holding[]; p: Portfolio; s: number }[] = []
      const seen = new Set<string>()
      for (const set of beam) {
        const spent = set.reduce((s, h) => s + (h.property.priceAed ?? 0), 0)
        for (const h of pool) {
          if (set.includes(h) || spent + (h.property.priceAed ?? 0) > budget) continue
          const combo = [...set, h]
          const key = combo.map((x) => x.property.slug).sort().join("|")
          if (seen.has(key)) continue
          seen.add(key)
          const p = evaluate(combo)
          next.push({ set: combo, p, s: score(p, goal, budget) })
        }
      }
      if (!next.length) break
      next.sort((a, b) => b.s - a.s)
      beam = next.slice(0, 60).map((n) => n.set)
      const top = next.find((n) => n.p.total >= budget * 0.6)
      if (top && (!best || top.s > score(best, goal, budget))) best = top.p
    }
    result[goal] = best
  }
  return result
}
