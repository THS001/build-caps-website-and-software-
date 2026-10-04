import { growthStep, normal, percentile, rng } from "./random"

// Wealth Twin: Monte Carlo of the buyer's net worth over 20 years, buying a
// Dubai unit versus keeping the same money invested at home. Both scenarios get
// the same cash: when the Dubai unit costs more than it earns, the home twin
// invests that top-up instead; when it earns more, the surplus is invested at
// home on the Dubai side. Everything is measured in today's home currency.

export type WealthTwinInput = {
  price: number
  /** Share paid in cash (1 = no mortgage). */
  downPct: number
  mortgageRate: number
  mortgageYears: number
  grossYield: number
  /** Service charges, maintenance and management as a share of rent. */
  costRatio: number
  growth: number
  volatility: number
  homeReturn: number
  homeVolatility: number
  /** Home-country tax on rental income. */
  homeTax: number
  /** Expected yearly change of the dirham against the home currency (+ = AED strengthens). */
  fxDrift: number
  fxVolatility: number
  buyingCostPct: number
  sellingCostPct: number
  /** Yearly value the buyer puts on UAE residency, added while the unit qualifies. */
  residencyValue: number
  years?: number
  paths?: number
  seed?: number
}

export type Band = { p10: number; p50: number; p90: number }
export type WealthTwinYear = { year: number; dubai: Band; home: Band; beatsHome: number }
export type WealthTwinResult = { years: WealthTwinYear[]; cashInvested: number; loan: number; annualPayment: number }

const band = (values: number[]): Band => {
  const s = [...values].sort((a, b) => a - b)
  return { p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
}

export function simulateWealthTwin(input: WealthTwinInput): WealthTwinResult {
  const years = input.years ?? 20
  const paths = input.paths ?? 2000
  const rand = rng(input.seed ?? 42)
  const loan = input.price * (1 - input.downPct)
  const r = input.mortgageRate
  const n = input.mortgageYears
  const annualPayment = loan > 0 ? (r > 0 ? (loan * r) / (1 - (1 + r) ** -n) : loan / n) : 0
  const cashInvested = input.price * input.downPct + input.price * input.buyingCostPct

  const dubai = Array.from({ length: years }, () => new Float64Array(paths))
  const home = Array.from({ length: years }, () => new Float64Array(paths))

  for (let p = 0; p < paths; p++) {
    let value = input.price
    let balance = loan
    let fx = 1
    let dubaiPot = 0
    let homePot = cashInvested
    for (let t = 0; t < years; t++) {
      const zMarket = normal(rand)
      const zHome = 0.2 * zMarket + Math.sqrt(1 - 0.04) * normal(rand)
      const homeStep = growthStep(input.homeReturn, input.homeVolatility, zHome)
      const vacancy = rand() * 0.1
      const rent = value * input.grossYield * (1 - vacancy) * (1 - input.costRatio) * (1 - input.homeTax)
      value *= growthStep(input.growth, input.volatility, zMarket)
      fx *= growthStep(input.fxDrift, input.fxVolatility, normal(rand))

      let payment = 0
      if (balance > 0 && t < n) {
        payment = Math.min(annualPayment, balance * (1 + r))
        balance = balance * (1 + r) - payment
      }
      const residency = input.price >= 2_000_000 ? input.residencyValue : 0
      const cashflow = rent - payment + residency
      dubaiPot = dubaiPot * homeStep + Math.max(cashflow, 0) * fx
      homePot = homePot * homeStep + Math.max(-cashflow, 0) * fx

      dubai[t][p] = (value * (1 - input.sellingCostPct) - balance) * fx + dubaiPot
      home[t][p] = homePot
    }
  }

  return {
    cashInvested,
    loan,
    annualPayment,
    years: dubai.map((d, t) => {
      let wins = 0
      for (let p = 0; p < paths; p++) if (d[p] > home[t][p]) wins++
      return { year: t + 1, dubai: band(Array.from(d)), home: band(Array.from(home[t])), beatsHome: wins / paths }
    }),
  }
}
