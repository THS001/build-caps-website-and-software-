import { clamp, normal, normalCdf, rng } from "./random"

// Ghost Tenant Market: a swarm of simulated tenants, calibrated to the
// community's typical rent, arrives day by day and "bids" on the unit. Each
// asking rent gives a distribution of days empty and the rent achieved, so the
// owner sees the trade-off instead of a single yield figure.

export type GhostInput = {
  /** Typical yearly rent for this unit in this community. */
  marketRent: number
  askingRent: number
  furnished: boolean
  waterfront: boolean
  sqft: number
  serviceChargePerSqft: number
  /** Month the unit is listed (0 = January); summer is slower. */
  month: number
  seed?: number
}

export type AskPoint = { asking: number; days: number; achieved: number; effective: number; signChance30: number }
export type ShortLet = { gross: number; costs: number; net: number; occupancy: number; nightly: number }
export type GhostResult = { curve: AskPoint[]; chosen: AskPoint; best: AskPoint; longLetNet: number; shortLet: ShortLet }

const DEMAND = [1.15, 1.15, 1.1, 1, 0.9, 0.75, 0.7, 0.75, 0.95, 1.1, 1.15, 1.1]
// Holiday-home occupancy and nightly-rate seasonality in Dubai (assumptions shown on the page).
const OCCUPANCY = [0.84, 0.85, 0.8, 0.72, 0.62, 0.52, 0.5, 0.52, 0.62, 0.74, 0.82, 0.86]
const RATE = [1.25, 1.2, 1.1, 0.95, 0.8, 0.7, 0.7, 0.72, 0.85, 1.05, 1.2, 1.3]
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const ARRIVALS_PER_DAY = 0.17
const LIKES_UNIT = 0.35

function simulate(input: GhostInput, asking: number, rand: () => number, runs = 400): AskPoint {
  let daysTotal = 0
  let rentTotal = 0
  let within30 = 0
  let signedRuns = 0
  const premium = input.furnished ? 1.06 : 1
  for (let r = 0; r < runs; r++) {
    let day = 0
    let signed = 0
    while (!signed && day < 365) {
      const demand = DEMAND[(input.month + Math.floor(day / 30)) % 12]
      const arrivals = rand() < ARRIVALS_PER_DAY * demand * 3 ? 1 + (rand() < 0.2 ? 1 : 0) : 0
      for (let a = 0; a < arrivals && !signed; a++) {
        if (rand() > LIKES_UNIT) continue
        const willing = input.marketRent * premium * Math.exp(0.08 * normal(rand))
        const discount = rand() * 0.05
        if (willing >= asking * (1 - discount)) signed = Math.round(asking * (1 - discount))
      }
      day += 3
    }
    daysTotal += day
    if (signed) {
      rentTotal += signed
      signedRuns++
    }
    if (day <= 30) within30++
  }
  const days = daysTotal / runs
  const achieved = signedRuns ? rentTotal / signedRuns : 0
  return { asking, days, achieved, effective: (achieved * Math.max(0, 365 - days)) / 365, signChance30: within30 / runs }
}

export function ghostTenant(input: GhostInput): GhostResult {
  const rand = rng(input.seed ?? 11)
  const curve: AskPoint[] = []
  for (let k = -15; k <= 15; k += 2.5) curve.push(simulate(input, Math.round((input.marketRent * (1 + k / 100)) / 500) * 500, rand))
  const best = curve.reduce((a, b) => (b.effective > a.effective ? b : a))
  const chosen = simulate(input, input.askingRent, rand)
  const serviceCharge = input.sqft * input.serviceChargePerSqft

  const nightlyBase = (input.marketRent / 365) * (input.waterfront ? 2.3 : 1.9)
  let gross = 0
  let nights = 0
  for (let m = 0; m < 12; m++) {
    gross += nightlyBase * RATE[m] * DAYS[m] * OCCUPANCY[m]
    nights += DAYS[m] * OCCUPANCY[m]
  }
  const furnishing = input.furnished ? 0 : (input.sqft * 45) / 5
  const costs = gross * 0.2 + 12 * 1_100 + 1_520 + furnishing
  return {
    curve,
    chosen,
    best,
    longLetNet: chosen.effective - serviceCharge,
    shortLet: { gross, costs, net: gross - costs - serviceCharge, occupancy: nights / 365, nightly: nightlyBase },
  }
}

/**
 * Earliest year in which selling probably (≥ 70%) returns more than was put in,
 * after buying and selling costs and with net rent counted.
 */
export function earliestExit({ growth, volatility, netYield, buyingCostPct = 0.07, sellingCostPct = 0.02, confidence = 0.7 }: { growth: number; volatility: number; netYield: number; buyingCostPct?: number; sellingCostPct?: number; confidence?: number }) {
  const chances: number[] = []
  for (let t = 1; t <= 10; t++) {
    const needed = (1 + buyingCostPct - netYield * t) / (1 - sellingCostPct)
    if (needed <= 0) {
      chances.push(1)
      continue
    }
    const mu = (Math.log(1 + growth) - (volatility * volatility) / 2) * t
    chances.push(clamp(1 - normalCdf((Math.log(needed) - mu) / (volatility * Math.sqrt(t))), 0, 1))
  }
  const year = chances.findIndex((c) => c >= confidence)
  return { year: year === -1 ? null : year + 1, chances }
}
