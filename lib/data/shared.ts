import type { Locale } from "@/i18n/locales"
import { supabaseConfigured } from "@/lib/supabase/config"
import type { Localized, Property } from "./types"

// Client-safe data helpers (no database access).

/** True while pages run on sample data; the UI labels figures as samples. */
export const SAMPLE_DATA = !supabaseConfigured

export function localize(value: Localized, locale: Locale) {
  return value[locale] ?? value.en
}

/** AED 2M+ properties may qualify for the 10-year Golden Visa. */
export const GOLDEN_VISA_THRESHOLD = 2_000_000

export function isGoldenVisaEligible(property: Pick<Property, "priceAed">) {
  return property.priceAed !== null && property.priceAed >= GOLDEN_VISA_THRESHOLD
}
