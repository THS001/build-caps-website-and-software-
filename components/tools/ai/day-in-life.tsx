"use client"

import { useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Car, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { dayInLifeAction, type DayResult } from "@/app/actions/intel"
import { departures, landmarkKeys, type Departure, type LandmarkKey } from "@/lib/geo/landmarks"
import type { ToolProperty } from "@/lib/insights/types"
import { formatMoney, formatNumber } from "@/lib/format"
import { NumberField } from "@/components/tools/ui"
import { Choice, SelectField, Speak, Stat, ToolLayout } from "@/components/tools/ai/common"
import { cn } from "@/lib/utils"

type Area = { slug: string; name: string; geo: { lat: number; lng: number } }
const SCHOOL_FEES = { none: 0, mid: 45_000, premium: 85_000 } as const
const KINDS = ["metro", "supermarket", "cafe", "restaurant", "gym", "park", "school", "health", "worship", "beach"] as const

export function DayInLife({ communities, properties }: { communities: Area[]; properties: ToolProperty[] }) {
  const t = useTranslations("intel.dayInLife")
  const locale = useLocale() as Locale
  const params = useSearchParams()
  const [place, setPlace] = useState(params.get("property") ? `p:${params.get("property")}` : `c:${params.get("community") ?? communities[0]?.slug ?? ""}`)
  const [departure, setDeparture] = useState<Departure>("08:00")
  const [destinations, setDestinations] = useState<LandmarkKey[]>(["difc"])
  const [adults, setAdults] = useState(2)
  const [kids, setKids] = useState(1)
  const [school, setSchool] = useState<keyof typeof SCHOOL_FEES>("mid")
  const [cars, setCars] = useState(1)
  const [result, setResult] = useState<DayResult | null | undefined>(undefined)
  const [pending, start] = useTransition()

  const property = place.startsWith("p:") ? properties.find((p) => p.slug === place.slice(2)) : undefined
  const area = property ? communities.find((c) => c.slug === property.communitySlug) : communities.find((c) => c.slug === place.slice(2))
  const at = property?.geo ?? area?.geo
  const toggle = (k: LandmarkKey) => setDestinations((d) => (d.includes(k) ? d.filter((x) => x !== k) : d.length >= 4 ? d : [...d, k]))

  const run = () => {
    if (!at || !destinations.length) return
    start(async () => setResult(await dayInLifeAction({ lat: at.lat, lng: at.lng, area: area?.name ?? "", destinations, departure, household: { adults, kids } }, locale).catch(() => null)))
  }

  const sqft = property?.sqft ?? 1000
  const costs = [
    ["serviceCharge", (sqft * (property?.serviceChargePerSqft ?? 16)) / 12],
    ["utilities", sqft * 0.45],
    ["internet", 450],
    ["groceries", adults * 1_200 + kids * 700],
    ["schools", (kids * SCHOOL_FEES[school]) / 12],
    ["transport", cars * 950],
  ] as const
  const monthly = costs.reduce((s, [, v]) => s + v, 0)
  const aed = (n: number) => formatMoney(n, "AED", locale, { compact: false })
  const distance = (km: number) => (km < 1 ? `${formatNumber(Math.max(50, Math.round(km * 20) * 50), locale)} m` : `${formatNumber(km, locale, { maximumFractionDigits: 1 })} km`)
  const nearest = (kind: (typeof KINDS)[number]) => result?.places.find((p) => p.kind === kind && p.name)
  const count = (kind: (typeof KINDS)[number]) => result?.places.filter((p) => p.kind === kind && p.km <= 1.5).length ?? 0

  return (
    <ToolLayout
      inputs={
        <>
          <SelectField label={t("where")} value={place} onChange={setPlace}>
            <optgroup label={t("communities")}>
              {communities.map((c) => (
                <option key={c.slug} value={`c:${c.slug}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("listings")}>
              {properties.map((p) => (
                <option key={p.slug} value={`p:${p.slug}`}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          </SelectField>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-neutral-700">{t("destinations")}</legend>
            <div className="flex flex-wrap gap-2">
              {landmarkKeys.map((k) => (
                <button key={k} type="button" aria-pressed={destinations.includes(k)} onClick={() => toggle(k)} className={cn("rounded-full border px-3 py-1.5 text-sm", destinations.includes(k) ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700")}>
                  {t(`places.${k}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <SelectField label={t("leave")} value={departure} onChange={(v) => setDeparture(v as Departure)}>
            {Object.keys(departures).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label={t("adults")} value={adults} onChange={setAdults} min={1} max={8} />
            <NumberField label={t("kids")} value={kids} onChange={setKids} min={0} max={8} />
            <NumberField label={t("cars")} value={cars} onChange={setCars} min={0} max={4} />
          </div>
          {kids > 0 && <Choice label={t("school")} value={school} onChange={setSchool} options={(["none", "mid", "premium"] as const).map((s) => ({ value: s, label: t(`schools.${s}`) }))} />}
          <button type="button" onClick={run} disabled={pending || !destinations.length} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("cta")}
          </button>
        </>
      }
      results={
        <div className="space-y-8">
          <Stat label={t("monthly")} value={<bdi>{aed(monthly)}</bdi>} hint={t("monthlyHint")} accent />
          <dl className="space-y-2 text-sm">
            {costs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="text-white/70">{t(`costs.${k}`)}</dt>
                <dd className="font-semibold">
                  <bdi>{aed(v)}</bdi>
                </dd>
              </div>
            ))}
          </dl>

          {result === undefined && <p className="text-white/70">{t("empty")}</p>}
          {result === null && <p className="text-white/70">{t("error")}</p>}
          {result && (
            <>
              <section>
                <h3 className="font-semibold">{t("commutes", { time: departure })}</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {result.commutes.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-rose-300" />
                        {t(`places.${c.key}`)}
                      </span>
                      <span className="text-end">
                        <span className="font-semibold">{t("minutes", { count: c.rushMinutes })}</span>
                        <span className="block text-xs text-white/50">{t("freeFlow", { minutes: c.minutes, km: formatNumber(c.km, locale, { maximumFractionDigits: 1 }) })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-white/50">{result.commutes.some((c) => c.source === "estimate") ? t("routeEstimate") : t("routeOsrm")}</p>
              </section>
              <section>
                <h3 className="font-semibold">{t("nearby")}</h3>
                {result.places.length ? (
                  <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {KINDS.map((k) => {
                      const n = nearest(k)
                      return (
                        <li key={k} className="rounded-xl bg-white/[0.06] px-3 py-2">
                          <span className="text-white/60">{t(`kinds.${k}`)}</span>
                          <span className="block font-medium">{n ? `${n.name} · ${distance(n.km)}` : "—"}</span>
                          {count(k) > 1 && <span className="text-xs text-white/50">{t("within", { count: count(k) })}</span>}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-white/60">{t("noPlaces")}</p>
                )}
                <p className="mt-2 text-xs text-white/50">{t("osm")}</p>
              </section>
              {result.story && (
                <section className="rounded-2xl bg-white/[0.06] p-5">
                  <h3 className="text-label text-rose-300">{t("story")}</h3>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-white/85">{result.story}</p>
                  <Speak text={result.story} />
                </section>
              )}
            </>
          )}
        </div>
      }
    />
  )
}
