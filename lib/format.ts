import { localeTags, type Locale } from "@/i18n/locales"

export const currencies = ["AED", "USD", "EUR", "GBP", "INR", "PKR", "RUB", "CNY"] as const
export type Currency = (typeof currencies)[number]

export const areaUnits = ["sqft", "sqm"] as const
export type AreaUnit = (typeof areaUnits)[number]

/**
 * AED per one unit of each currency. AED is pegged to USD at 3.6725; the others
 * are reference rates until M6 replaces them with a daily feed. They are only
 * ever shown as an "≈" conversion next to the AED price, never on their own.
 */
export const aedPer: Record<Currency, number> = {
  AED: 1,
  USD: 3.6725,
  EUR: 4.3,
  GBP: 4.95,
  INR: 0.0418,
  PKR: 0.0131,
  RUB: 0.0455,
  CNY: 0.514,
}

const SQM_PER_SQFT = 0.09290304

/**
 * The Intl locale for formatting. Persian keeps its own digits but switches to
 * the Gregorian calendar, because handover dates and contracts are Gregorian.
 */
export function intlLocale(locale: Locale) {
  const tag = localeTags[locale]
  return locale === "fa" ? `${tag}-u-ca-gregory` : tag
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions) {
  const key = `n|${locale}|${JSON.stringify(options)}`
  let f = cache.get(key) as Intl.NumberFormat | undefined
  if (!f) cache.set(key, (f = new Intl.NumberFormat(intlLocale(locale), options)))
  return f
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = `d|${locale}|${JSON.stringify(options)}`
  let f = cache.get(key) as Intl.DateTimeFormat | undefined
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Dubai", ...options })))
  return f
}

export function convertFromAed(aed: number, currency: Currency) {
  return aed / aedPer[currency]
}

/** "AED 1.81M" in English; each locale gets its own compact wording ("1,81 Mio. AED", "AED 18.1 लाख"). */
export function formatMoney(amount: number, currency: Currency, locale: Locale, { compact = true } = {}) {
  return numberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: currency === "AED" ? "code" : "symbol",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: amount >= 1e6 ? 2 : 0 }
      : { maximumFractionDigits: 0 }),
  }).format(amount)
}

export function formatAedAs(aed: number, currency: Currency, locale: Locale, options?: { compact?: boolean }) {
  return formatMoney(convertFromAed(aed, currency), currency, locale, options)
}

export function toArea(sqft: number, unit: AreaUnit) {
  return unit === "sqm" ? sqft * SQM_PER_SQFT : sqft
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return numberFormat(locale, { maximumFractionDigits: 0, ...options }).format(value)
}

/** 0.072 → "7.2%" */
export function formatPercent(ratio: number, locale: Locale, fractionDigits = 1) {
  return numberFormat(locale, { style: "percent", maximumFractionDigits: fractionDigits }).format(ratio)
}

export function formatDate(date: Date | string, locale: Locale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return dateFormat(locale, options).format(typeof date === "string" ? new Date(date) : date)
}

/** Handover quarter parts for the `common.quarter` message ("Q{quarter} {year}"). */
export function quarterParts(date: Date | string, locale: Locale) {
  const d = typeof date === "string" ? new Date(date) : date
  return {
    quarter: formatNumber(Math.floor(d.getUTCMonth() / 3) + 1, locale),
    year: formatNumber(d.getUTCFullYear(), locale, { useGrouping: false }),
  }
}
