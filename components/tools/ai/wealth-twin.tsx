"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel, ToolProperty } from "@/lib/insights/types"
import { simulateWealthTwin } from "@/lib/insights/wealth-twin"
import { convertFromAed, currencies, formatMoney, formatPercent, type Currency } from "@/lib/format"
import { usePreferences } from "@/components/preferences-provider"
import { NumberField } from "@/components/tools/ui"
import { BasisNote, Explain, SelectField, Stat, ToolLayout } from "@/components/tools/ai/common"

type Props = { model: CommunityModel[]; properties: ToolProperty[] }

export function WealthTwin({ model, properties }: Props) {
  const t = useTranslations("intel.wealthTwin")
  const locale = useLocale() as Locale
  const params = useSearchParams()
  const { currency: preferred } = usePreferences()
  const forSale = properties.filter((p) => p.listing === "sale" && p.priceAed)
  const initial = forSale.find((p) => p.slug === params.get("property"))

  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [community, setCommunity] = useState(initial?.communitySlug ?? model[0]?.slug ?? "")
  const [price, setPrice] = useState(initial?.priceAed ?? 2_000_000)
  const [currency, setCurrency] = useState<Currency>(preferred === "AED" ? "USD" : preferred)
  const [down, setDown] = useState(100)
  const [rate, setRate] = useState(4.5)
  const [homeReturn, setHomeReturn] = useState(5)
  const [homeVol, setHomeVol] = useState(10)
  const [tax, setTax] = useState(0)
  const [fx, setFx] = useState(0)
  const [residency, setResidency] = useState(0)

  useEffect(() => {
    if (preferred !== "AED") setCurrency(preferred)
  }, [preferred])

  const pickProperty = (value: string) => {
    setSlug(value)
    const p = forSale.find((x) => x.slug === value)
    if (p) {
      setPrice(p.priceAed ?? price)
      setCommunity(p.communitySlug)
    }
  }

  const c = model.find((m) => m.slug === community) ?? model[0]
  const property = forSale.find((p) => p.slug === slug)
  // The simulation (2,000 paths) runs on a deferred copy of the inputs so typing stays smooth.
  const key = useDeferredValue(JSON.stringify({ price, down, rate, homeReturn, homeVol, tax, fx, residency, community: c?.slug, grossYield: property?.estYield ?? c?.grossYield }))
  const result = useMemo(() => {
    const inputs = JSON.parse(key)
    const c = model.find((m) => m.slug === inputs.community)
    if (!c || inputs.price <= 0) return null
    return simulateWealthTwin({
      price: inputs.price,
      downPct: inputs.down / 100,
      mortgageRate: inputs.rate / 100,
      mortgageYears: 25,
      grossYield: inputs.grossYield,
      costRatio: 0.25,
      growth: c.growth,
      volatility: c.volatility,
      homeReturn: inputs.homeReturn / 100,
      homeVolatility: inputs.homeVol / 100,
      homeTax: inputs.tax / 100,
      fxDrift: inputs.fx / 100,
      fxVolatility: 0.04,
      buyingCostPct: 0.07,
      sellingCostPct: 0.02,
      residencyValue: inputs.residency,
    })
  }, [key, model])

  const money = (aed: number) => formatMoney(convertFromAed(aed, currency), currency, locale)
  const chart = result?.years.map((y) => ({
    year: y.year,
    dubaiLow: convertFromAed(y.dubai.p10, currency),
    dubaiBand: convertFromAed(y.dubai.p90 - y.dubai.p10, currency),
    dubai: convertFromAed(y.dubai.p50, currency),
    home: convertFromAed(y.home.p50, currency),
  }))
  const at = (year: number) => result?.years[year - 1]

  return (
    <ToolLayout
      inputs={
        <>
          <SelectField label={t("property")} value={slug} onChange={pickProperty}>
            <option value="">{t("custom")}</option>
            {forSale.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </SelectField>
          {!property && (
            <SelectField label={t("community")} value={community} onChange={setCommunity}>
              {model.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </SelectField>
          )}
          <NumberField label={t("price")} value={price} onChange={setPrice} step={50_000} suffix="AED" />
          <SelectField label={t("currency")} value={currency} onChange={(v) => setCurrency(v as Currency)}>
            {currencies.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </SelectField>
          <NumberField label={t("down")} value={down} onChange={(v) => setDown(Math.min(100, Math.max(20, v)))} min={20} max={100} step={5} suffix="%" />
          {down < 100 && <NumberField label={t("rate")} value={rate} onChange={setRate} step={0.25} suffix="%" />}
          <details className="rounded-xl border border-neutral-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-800">{t("homeAssumptions")}</summary>
            <div className="mt-4 space-y-4">
              <NumberField label={t("homeReturn")} value={homeReturn} onChange={setHomeReturn} step={0.5} min={-5} max={20} suffix="%" />
              <NumberField label={t("homeVol")} value={homeVol} onChange={setHomeVol} step={1} min={0} max={40} suffix="%" />
              <NumberField label={t("tax")} value={tax} onChange={setTax} step={1} min={0} max={60} suffix="%" />
              <NumberField label={t("fx")} value={fx} onChange={setFx} step={0.5} min={-10} max={10} suffix="%" />
              {price >= 2_000_000 && <NumberField label={t("residency")} value={residency} onChange={setResidency} step={1_000} suffix="AED" />}
            </div>
          </details>
        </>
      }
      results={
        result && c ? (
          <div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[5, 10, 20].map((y) => (
                <Stat key={y} label={t("inYears", { years: y })} value={<bdi>{money(at(y)!.dubai.p50)}</bdi>} hint={t("vsHome", { amount: money(at(y)!.home.p50) })} accent={y === 10} />
              ))}
            </div>
            <div className="mt-8 h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="year" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} width={64} tickFormatter={(v: number) => formatMoney(v, currency, locale)} />
                  <Tooltip formatter={(v: number) => formatMoney(v, currency, locale)} labelFormatter={(y) => t("year", { year: y })} contentStyle={{ color: "#111" }} />
                  <Area dataKey="dubaiLow" stackId="band" stroke="none" fill="transparent" tooltipType="none" />
                  <Area dataKey="dubaiBand" stackId="band" stroke="none" fill="rgba(183,110,121,.3)" tooltipType="none" />
                  <Line dataKey="dubai" name={t("dubaiLine")} stroke="#e7b6bd" strokeWidth={3} dot={false} />
                  <Line dataKey="home" name={t("homeLine")} stroke="#ffffff" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-white/60">{t("chartNote")}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {[5, 10, 20].map((y) => (
                <li key={y} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <span className="text-white/70">{t("chanceAhead", { years: y })}</span>
                  <span className="font-semibold">{formatPercent(at(y)!.beatsHome, locale, 0)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span className="text-white/70">{t("cashIn")}</span>
                <bdi className="font-semibold">{money(result.cashInvested)}</bdi>
              </li>
            </ul>
            <BasisNote basis={c.basis} className="mt-4 !text-white/50" />
            <Explain
              kind="wealthTwin"
              facts={{
                currency,
                price,
                community: c.name,
                downPaymentPct: down,
                assumptions: { growth: c.growth, volatility: c.volatility, homeReturn: homeReturn / 100, homeTax: tax / 100, fxDrift: fx / 100 },
                horizons: [5, 10, 20].map((y) => ({ years: y, dubaiMedian: Math.round(convertFromAed(at(y)!.dubai.p50, currency)), dubaiP10: Math.round(convertFromAed(at(y)!.dubai.p10, currency)), dubaiP90: Math.round(convertFromAed(at(y)!.dubai.p90, currency)), homeMedian: Math.round(convertFromAed(at(y)!.home.p50, currency)), chanceDubaiAhead: at(y)!.beatsHome })),
              }}
            />
          </div>
        ) : null
      }
    />
  )
}
