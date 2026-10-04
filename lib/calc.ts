// Pure calculation functions behind the /tools calculators. All outputs are estimates.

/** Standard amortised monthly payment. */
export function monthlyPayment(principal: number, annualRatePct: number, years: number) {
  const n = Math.max(1, Math.round(years * 12))
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - (1 + r) ** -n)
}

/** Typical maximum loan-to-value: UAE residents (first home ≤ AED 5M) 80%, above that 70%; non-residents about 60%. */
export function maxLtv(price: number, resident: boolean) {
  if (!resident) return 0.6
  return price <= 5_000_000 ? 0.8 : 0.7
}

export const DLD_FEE = 0.04
const VAT = 1.05

export type CostItem = { key: "dld" | "registration" | "agency" | "mortgageReg" | "valuation" | "arrangement"; amount: number }

/** Typical buying costs in Dubai. Fixed fees are common published figures and vary by developer and bank. */
export function buyingCosts({ price, offPlan, resale, loan }: { price: number; offPlan: boolean; resale: boolean; loan: number }): CostItem[] {
  const items: CostItem[] = [{ key: "dld", amount: price * DLD_FEE }]
  // Ready: trustee office fee (AED 4,000 + VAT, or 2,000 + VAT under AED 500K) plus the AED 580 title deed.
  // Off-plan: developer and Oqood registration admin, typically around AED 4,000.
  items.push({ key: "registration", amount: offPlan ? 4_000 : (price >= 500_000 ? 4_000 : 2_000) * VAT + 580 })
  if (resale && !offPlan) items.push({ key: "agency", amount: price * 0.02 * VAT })
  if (loan > 0) {
    items.push({ key: "mortgageReg", amount: loan * 0.0025 + 290 })
    items.push({ key: "valuation", amount: 3_150 })
    items.push({ key: "arrangement", amount: Math.min(loan * 0.01, 20_000) * VAT })
  }
  return items
}

export function roi({
  price,
  annualRent,
  annualCosts,
  appreciationPct,
  years,
}: {
  price: number
  annualRent: number
  annualCosts: number
  appreciationPct: number
  years: number
}) {
  const purchaseCosts = buyingCosts({ price, offPlan: false, resale: false, loan: 0 }).reduce((sum, i) => sum + i.amount, 0)
  const netIncome = annualRent - annualCosts
  const invested = price + purchaseCosts
  const futureValue = price * (1 + appreciationPct / 100) ** years
  const totalReturn = futureValue - price + netIncome * years - purchaseCosts
  return {
    grossYield: price > 0 ? annualRent / price : 0,
    netYield: invested > 0 ? netIncome / invested : 0,
    netIncome,
    futureValue,
    totalReturn,
    totalReturnPct: invested > 0 ? totalReturn / invested : 0,
  }
}

export type PlanStage = "booking" | "construction" | "handover" | "post"
export type Instalment = { month: number; stage: PlanStage; amount: number }

/** Spreads an off-plan plan over time: booking now, equal construction and post-handover instalments. */
export function paymentSchedule({
  price,
  onBooking,
  duringConstruction,
  onHandover,
  postHandover,
  monthsToHandover,
  postHandoverMonths,
  everyMonths,
}: {
  price: number
  onBooking: number
  duringConstruction: number
  onHandover: number
  postHandover: number
  monthsToHandover: number
  postHandoverMonths: number
  everyMonths: 1 | 3
}): Instalment[] {
  const out: Instalment[] = []
  const pct = (p: number) => (price * p) / 100
  if (onBooking > 0) out.push({ month: 0, stage: "booking", amount: pct(onBooking) })

  const constructionMonths: number[] = []
  for (let m = everyMonths; m < monthsToHandover; m += everyMonths) constructionMonths.push(m)
  if (duringConstruction > 0 && constructionMonths.length === 0) constructionMonths.push(Math.max(1, monthsToHandover - 1))
  constructionMonths.forEach((month) => out.push({ month, stage: "construction", amount: pct(duringConstruction) / constructionMonths.length }))

  if (onHandover > 0) out.push({ month: monthsToHandover, stage: "handover", amount: pct(onHandover) })

  if (postHandover > 0) {
    const count = Math.max(1, Math.floor(postHandoverMonths / everyMonths))
    for (let i = 1; i <= count; i++) out.push({ month: monthsToHandover + i * everyMonths, stage: "post", amount: pct(postHandover) / count })
  }
  return out
}

export const GOLDEN_VISA_MIN = 2_000_000
