import { BadgeCheck, Calculator, CalendarRange, Coins, Landmark, Repeat } from "lucide-react"

/** The free calculators on /tools/[slug]; `key` is their message namespace under tools.calculators. */
export const calculators = [
  { key: "roi", slug: "roi", icon: Calculator },
  { key: "mortgage", slug: "mortgage", icon: Landmark },
  { key: "paymentPlan", slug: "payment-plan", icon: CalendarRange },
  { key: "fees", slug: "buying-costs", icon: Coins },
  { key: "goldenVisa", slug: "golden-visa", icon: BadgeCheck },
  { key: "currency", slug: "currency", icon: Repeat },
] as const

export type CalculatorKey = (typeof calculators)[number]["key"]
