// Style Moodboard choices, shared by the listing page and its server action.

export const moodStyles = ["modernArabic", "japandi", "coastal", "contemporaryLuxe", "scandinavian", "midCentury"] as const
export const moodBudgets = ["essential", "comfort", "premium"] as const
export type MoodStyle = (typeof moodStyles)[number]
export type MoodBudget = (typeof moodBudgets)[number]

/** Rough Dubai furnishing cost per square foot (AED), by budget level. */
export const BUDGET_AED_PER_SQFT: Record<MoodBudget, [number, number]> = {
  essential: [40, 70],
  comfort: [70, 130],
  premium: [130, 250],
}

export type Moodboard = {
  name: string
  story: string
  palette: { name: string; hex: string; use: string }[]
  materials: string[]
  rooms: { room: string; idea: string }[]
  pieces: { item: string; why: string; priceAed: number }[]
  totalAed: number
  tips: string[]
}
