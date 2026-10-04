"use client"

import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { formatAedAs, formatMoney, formatNumber, toArea } from "@/lib/format"
import { usePreferences } from "@/components/preferences-provider"
import { cn } from "@/lib/utils"

type PriceProps = {
  /** Price in AED; null shows "Price on request". */
  aed: number | null
  compact?: boolean
  /** Show the "≈ $492.9K" conversion when the visitor picked another currency. */
  approx?: boolean
  className?: string
  approxClassName?: string
}

/** Always leads with AED (Dubai ads must quote AED) and adds the visitor's currency as an estimate. */
export function Price({ aed, compact = true, approx = true, className, approxClassName }: PriceProps) {
  const locale = useLocale() as Locale
  const t = useTranslations("common")
  const { currency } = usePreferences()

  if (aed === null) return <span className={className}>{t("priceOnRequest")}</span>

  return (
    <span className={className}>
      <bdi>{formatMoney(aed, "AED", locale, { compact })}</bdi>
      {approx && currency !== "AED" && (
        <span className={cn("ms-2 text-[0.8em] font-normal opacity-70", approxClassName)}>
          {t("approx", { amount: formatAedAs(aed, currency, locale, { compact }) })}
        </span>
      )}
    </span>
  )
}

/** Built-up area stored in sq ft, shown in the visitor's unit. */
export function Area({ sqft, className }: { sqft: number; className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("common")
  const { unit } = usePreferences()

  return (
    <span className={className}>
      {t("area", { value: formatNumber(toArea(sqft, unit), locale), unit: t(`units.${unit}`) })}
    </span>
  )
}
