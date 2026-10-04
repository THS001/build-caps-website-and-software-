import { growthStep, normal, percentile, rng } from "./random"
import type { CommunityModel } from "./types"

// Regret Radar. Looking back: what a purchase in an earlier year would be worth
// now. Looking forward: for options at the same budget, how likely each one is
// to trail the best alternative by a wide margin (the choice you'd regret).

const COST_RATIO = 0.25

export type Hindsight = {
  boughtFor: number
  valueNow: number
  rentEarned: number
  buyingCosts: number
  gain: number
  cagr: number
  years: number
  /** Same money, same year, spread across every community: the Dubai average. */
  dubaiGain: number
}

/** "Had you bought here in {year}": value today plus net rent, after buying costs. */
export function hindsight(model: CommunityModel, all: CommunityModel[], year: number, amount: number, buyingCostPct = 0.07): Hindsight | null {
  const run = (m: CommunityModel) => {
    const start = m.history.find((h) => h.year === year)
    const end = m.history[m.history.length - 1]
    if (!start || !end || end.year <= year) return null
    const sqft = amount / start.pricePerSqft
    let rent = 0
    for (const h of m.history) if (h.year >= year && h.year < end.year) rent += sqft * h.pricePerSqft * m.grossYield * (1 - COST_RATIO)
    const valueNow = sqft * end.pricePerSqft
    const costs = amount * buyingCostPct
    return { valueNow, rent, costs, years: end.year - year }
  }
  const own = run(model)
  if (!own) return null
  const peers = all.map(run).filter((r): r is NonNullable<typeof r> => r !== null)
  const avg = peers.length ? peers.reduce((s, r) => s + r.valueNow + r.rent - r.costs, 0) / peers.length - amount : 0
  const gain = own.valueNow + own.rent - own.costs - amount
  return {
    boughtFor: amount,
    valueNow: own.valueNow,
    rentEarned: own.rent,
    buyingCosts: own.costs,
    gain,
    cagr: (Math.max(0.01, amount + gain) / amount) ** (1 / own.years) - 1,
    years: own.years,
    dubaiGain: avg,
  }
}

export type RegretOption = { id: string; label: string; growth: number; volatility: number; grossYield: number }
export type RegretResult = { id: string; label: string; median: number; p10: number; p90: number; lossChance: number; regret: number }

/**
 * Simulates every option over the same market paths (a shared Dubai factor plus
 * each option's own noise) and counts how often each trails the best other
 * option by more than `margin` of total return.
 */
export function regretRadar(options: RegretOption[], { years = 10, margin = 0.2, paths = 3000, buyingCostPct = 0.07, sellingCostPct = 0.02, seed = 7 } = {}): RegretResult[] {
  const rand = rng(seed)
  const returns = options.map(() => new Float64Array(paths))
  const rho = 0.7
  for (let p = 0; p < paths; p++) {
    const values = options.map(() => 1)
    const rent = options.map(() => 0)
    for (let t = 0; t < years; t++) {
      const common = normal(rand)
      options.forEach((o, i) => {
        rent[i] += values[i] * o.grossYield * (1 - COST_RATIO) * (1 - rand() * 0.1)
        values[i] *= growthStep(o.growth, o.volatility, rho * common + Math.sqrt(1 - rho * rho) * normal(rand))
      })
    }
    options.forEach((_, i) => {
      returns[i][p] = (values[i] * (1 - sellingCostPct) + rent[i]) / (1 + buyingCostPct) - 1
    })
  }
  return options.map((o, i) => {
    let regrets = 0
    let losses = 0
    for (let p = 0; p < paths; p++) {
      let best = -Infinity
      for (let j = 0; j < options.length; j++) if (j !== i) best = Math.max(best, returns[j][p])
      if (best - returns[i][p] > margin) regrets++
      if (returns[i][p] < 0) losses++
    }
    const sorted = Array.from(returns[i]).sort((a, b) => a - b)
    return { id: o.id, label: o.label, median: percentile(sorted, 0.5), p10: percentile(sorted, 0.1), p90: percentile(sorted, 0.9), lossChance: losses / paths, regret: regrets / paths }
  })
}
