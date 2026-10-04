import { Car, GraduationCap, TrainFront, Wallet } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { Property } from "@/lib/data/types"
import { formatMoney, formatNumber } from "@/lib/format"
import { monthlyCost, rushMinutes } from "@/lib/search/lifestyle"

const COMMUTES = ["difc", "downtown", "dxb"] as const

/** Monthly cost, rush-hour drives and the nearest metro and school, as used by the lifestyle filters. */
export function LivingHere({ property }: { property: Property }) {
  const t = useTranslations("properties.lifestyle")
  const tp = useTranslations("intel.dayInLife.places")
  const locale = useLocale() as Locale
  const cost = monthlyCost(property)
  const near = property.surroundings?.nearest ?? {}

  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
      {cost !== null && (
        <div className="flex items-start gap-3 rounded-2xl bg-sand-100/70 p-4">
          <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <dt className="text-sm text-neutral-500">{t("monthlyHere")}</dt>
            <dd className="font-semibold text-neutral-900">
              <bdi>{formatMoney(cost, "AED", locale)}</bdi>
            </dd>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3 rounded-2xl bg-sand-100/70 p-4">
        <Car className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
        <div>
          <dt className="text-sm text-neutral-500">{t("rushHour")}</dt>
          <dd className="text-sm text-neutral-900">{COMMUTES.map((k) => `${tp(k)} ${t("minutesShort", { count: rushMinutes(property, k) })}`).join(" · ")}</dd>
        </div>
      </div>
      {near.metro !== undefined && (
        <div className="flex items-start gap-3 rounded-2xl bg-sand-100/70 p-4">
          <TrainFront className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <dt className="text-sm text-neutral-500">{t("nearestMetro")}</dt>
            <dd className="font-semibold text-neutral-900">{t("km", { value: formatNumber(near.metro, locale, { maximumFractionDigits: 1 }) })}</dd>
          </div>
        </div>
      )}
      {near.school !== undefined && (
        <div className="flex items-start gap-3 rounded-2xl bg-sand-100/70 p-4">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <dt className="text-sm text-neutral-500">{t("nearestSchool")}</dt>
            <dd className="font-semibold text-neutral-900">{t("km", { value: formatNumber(near.school, locale, { maximumFractionDigits: 1 }) })}</dd>
          </div>
        </div>
      )}
    </dl>
  )
}
