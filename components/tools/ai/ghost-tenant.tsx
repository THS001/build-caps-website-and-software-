"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel, ToolProperty } from "@/lib/insights/types"
import { earliestExit, ghostTenant } from "@/lib/insights/ghost-tenant"
import { formatMoney, formatNumber, formatPercent, intlLocale } from "@/lib/format"
import { NumberField, Toggle } from "@/components/tools/ui"
import { BasisNote, Explain, SelectField, Stat, ToolLayout } from "@/components/tools/ai/common"

export function GhostTenant({ model, properties }: { model: CommunityModel[]; properties: ToolProperty[] }) {
  const t = useTranslations("intel.ghostTenant")
  const locale = useLocale() as Locale
  const params = useSearchParams()
  const initial = properties.find((p) => p.slug === params.get("property"))
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [community, setCommunity] = useState(initial?.communitySlug ?? model[0]?.slug ?? "")
  const [sqft, setSqft] = useState(initial?.sqft ?? 900)
  const [furnished, setFurnished] = useState(initial?.furnished ?? false)
  const [month, setMonth] = useState(new Date().getMonth())
  const c = model.find((m) => m.slug === community) ?? model[0]
  const property = properties.find((p) => p.slug === slug)
  const marketRent = c ? Math.round((c.pricePerSqft * sqft * (property?.estYield ?? c.grossYield)) / 1000) * 1000 : 0
  const [asking, setAsking] = useState<number | null>(null)
  const ask = asking ?? marketRent

  const pick = (value: string) => {
    setSlug(value)
    setAsking(null)
    const p = properties.find((x) => x.slug === value)
    if (p) {
      setCommunity(p.communitySlug)
      setSqft(p.sqft)
      setFurnished(p.furnished)
    }
  }

  const key = useDeferredValue(JSON.stringify({ marketRent, ask, furnished, sqft, month, waterfront: c?.waterfront ?? false, sc: property?.serviceChargePerSqft ?? 16 }))
  const result = useMemo(() => {
    const i = JSON.parse(key)
    if (!(i.marketRent > 0) || !(i.ask > 0)) return null
    return ghostTenant({ marketRent: i.marketRent, askingRent: i.ask, furnished: i.furnished, waterfront: i.waterfront, sqft: i.sqft, serviceChargePerSqft: i.sc, month: i.month })
  }, [key])
  const exit = c && result ? earliestExit({ growth: c.growth, volatility: c.volatility, netYield: result.longLetNet / (c.pricePerSqft * sqft) }) : null
  const aed = (n: number) => formatMoney(n, "AED", locale, { compact: false })
  const months = Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(intlLocale(locale), { month: "long" }).format(new Date(2026, m, 1)))

  return (
    <ToolLayout
      inputs={
        <>
          <SelectField label={t("property")} value={slug} onChange={pick}>
            <option value="">{t("custom")}</option>
            {properties.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </SelectField>
          {!property && (
            <>
              <SelectField label={t("community")} value={community} onChange={(v) => (setCommunity(v), setAsking(null))}>
                {model.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </SelectField>
              <NumberField label={t("size")} value={sqft} onChange={(v) => (setSqft(v), setAsking(null))} step={50} min={250} suffix="ft²" />
              <Toggle label={t("furnished")} checked={furnished} onChange={setFurnished} />
            </>
          )}
          <NumberField label={t("asking")} value={ask} onChange={setAsking} step={1_000} suffix="AED" />
          <p className="-mt-3 text-xs text-neutral-500">{t("marketHint", { amount: aed(marketRent) })}</p>
          <SelectField label={t("month")} value={String(month)} onChange={(v) => setMonth(Number(v))}>
            {months.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </SelectField>
        </>
      }
      results={
        result && c ? (
          <div>
            <div className="grid gap-6 sm:grid-cols-3">
              <Stat label={t("bestAsking")} value={<bdi>{aed(result.best.asking)}</bdi>} hint={t("bestHint", { days: Math.round(result.best.days) })} accent />
              <Stat label={t("yourDays")} value={formatNumber(Math.round(result.chosen.days), locale)} hint={t("signChance", { value: formatPercent(result.chosen.signChance30, locale, 0) })} />
              <Stat label={t("firstYear")} value={<bdi>{formatMoney(result.chosen.effective, "AED", locale)}</bdi>} hint={t("firstYearHint")} />
            </div>
            <div className="mt-8 h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.curve.map((p) => ({ asking: p.asking, days: Math.round(p.days), income: Math.round(p.effective) }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                  <XAxis dataKey="asking" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v / 1000, locale) + "K"} />
                  <YAxis yAxisId="days" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} width={36} />
                  <YAxis yAxisId="income" orientation="right" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => formatNumber(Math.round(v / 1000), locale) + "K"} />
                  <Tooltip contentStyle={{ color: "#111" }} labelFormatter={(v) => aed(Number(v))} />
                  <ReferenceLine yAxisId="days" x={result.best.asking} stroke="#e7b6bd" strokeDasharray="3 3" />
                  <Line yAxisId="days" dataKey="days" name={t("daysEmpty")} stroke="#ffffff" strokeWidth={2} dot={false} />
                  <Line yAxisId="income" dataKey="income" name={t("income")} stroke="#e7b6bd" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-white/60">{t("chartNote")}</p>

            <h3 className="mt-8 font-semibold">{t("letTitle")}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="text-white/70">{t("longLet")}</dt>
                <dd className="font-semibold">
                  <bdi>{aed(result.longLetNet)}</bdi>
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="text-white/70">{t("shortLet", { occupancy: formatPercent(result.shortLet.occupancy, locale, 0), nightly: aed(result.shortLet.nightly) })}</dt>
                <dd className="font-semibold">
                  <bdi>{aed(result.shortLet.net)}</bdi>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-white/50">{t("shortLetNote")}</p>
            {exit && <p className="mt-6 font-semibold text-rose-300">{exit.year ? t("exit", { years: exit.year }) : t("exitLater")}</p>}
            <BasisNote basis={c.basis} className="mt-4 !text-white/50" />
            <Explain kind="ghostTenant" facts={{ community: c.name, sqft, furnished, marketRent, asking: ask, best: result.best, yours: result.chosen, longLetNet: result.longLetNet, shortLet: result.shortLet, earliestSensibleExitYear: exit?.year ?? null }} />
          </div>
        ) : null
      }
    />
  )
}
