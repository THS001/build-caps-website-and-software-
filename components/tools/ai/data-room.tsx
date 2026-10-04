"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel } from "@/lib/insights/types"
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/format"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { NumberField } from "@/components/tools/ui"
import { BasisNote, Explain } from "@/components/tools/ai/common"
import { cn } from "@/lib/utils"

export type Transaction = { date: string; area: string; rooms: string | null; sqm: number; worth: number; ppsm: number; project: string | null }

type SortKey = "pricePerSqft" | "grossYield" | "change" | "growth"
const SQM_PER_SQFT = 0.09290304

export function DataRoom({ model, transactions }: { model: CommunityModel[]; transactions: Transaction[] }) {
  const t = useTranslations("intel.dataRoom")
  const locale = useLocale() as Locale
  const [sort, setSort] = useState<SortKey>("pricePerSqft")
  const [selected, setSelected] = useState(model[0]?.slug ?? "")
  const basis = model.some((m) => m.basis === "dld") ? "dld" : "sample"

  const rows = useMemo(() => {
    const change = (m: CommunityModel) => {
      const h = m.history
      return h.length >= 2 ? h[h.length - 1].pricePerSqft / h[h.length - 2].pricePerSqft - 1 : 0
    }
    return model.map((m) => ({ ...m, change: change(m) })).sort((a, b) => (b[sort] as number) - (a[sort] as number))
  }, [model, sort])

  const current = model.find((m) => m.slug === selected) ?? model[0]
  const chart = useMemo(() => {
    if (!current) return []
    const years = current.history.map((h) => h.year)
    return years.map((year) => {
      const all = model.map((m) => m.history.find((h) => h.year === year)?.pricePerSqft).filter((v): v is number => v !== undefined)
      return { year, community: current.history.find((h) => h.year === year)?.pricePerSqft, dubai: all.length ? Math.round(all.reduce((s, v) => s + v, 0) / all.length) : undefined }
    })
  }, [current, model])

  const aed = (n: number) => formatMoney(n, "AED", locale, { compact: false })
  const header = (key: SortKey, label: string) => (
    <th className="px-4 py-3 text-end font-medium">
      <button type="button" onClick={() => setSort(key)} className={cn("hover:text-neutral-900", sort === key && "text-rose-700")} aria-pressed={sort === key}>
        {label}
      </button>
    </th>
  )

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-5">
        <div className="min-w-0 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">{t("trendTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-500">{t("trendBody")}</p>
            </div>
            <label className="text-sm">
              <span className="sr-only">{t("community")}</span>
              <select value={current?.slug} onChange={(e) => setSelected(e.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm">
                {model.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-6 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={56} tickFormatter={(v: number) => formatNumber(v, locale)} />
                <Tooltip formatter={(v: number) => aed(v)} />
                <Legend />
                <Line type="monotone" dataKey="community" name={current?.name} stroke="#b76e79" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="dubai" name={t("dubaiAverage")} stroke="#004274" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <BasisNote basis={current?.basis ?? basis} className="mt-4" />
          {current && <Explain kind="dataRoom" tone="light" facts={{ community: current.name, history: current.history, yield: current.grossYield, projectedGrowth: current.growth, volatility: current.volatility, basis: current.basis }} />}
        </div>
        <div className="h-[420px] overflow-hidden rounded-3xl ring-1 ring-neutral-200 lg:col-span-2 lg:h-auto">
          <LazyPropertyMap label={t("mapLabel")} pins={model.map((m) => ({ id: m.slug, lat: m.geo.lat, lng: m.geo.lng, label: `${formatNumber(m.pricePerSqft, locale)}/ft²`, href: `/${locale === "en" ? "" : `${locale}/`}communities/${m.slug}` }))} className="h-full" />
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white ring-1 ring-neutral-200">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-6 pt-6 text-start text-xl font-semibold text-neutral-900">{t("tableTitle")}</caption>
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t("community")}</th>
              {header("pricePerSqft", t("pricePerSqft"))}
              {header("grossYield", t("yield"))}
              {header("change", t("change"))}
              {header("growth", t("outlook"))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.slug} className={cn("border-b border-neutral-100 last:border-0", m.slug === current?.slug && "bg-rose-50/50")}>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelected(m.slug)} className="font-medium text-neutral-900 hover:text-rose-700">
                    {m.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-end">
                  <bdi>{aed(m.pricePerSqft)}</bdi>
                </td>
                <td className="px-4 py-3 text-end">{formatPercent(m.grossYield, locale)}</td>
                <td className={cn("px-4 py-3 text-end", m.change >= 0 ? "text-emerald-700" : "text-red-600")}>{formatPercent(m.change, locale)}</td>
                <td className="px-4 py-3 text-end text-neutral-600">{formatPercent(m.growth, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-6 pb-6 text-xs text-neutral-500">{t("outlookNote")}</p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8">
          <h2 className="text-xl font-semibold text-neutral-900">{t("feedTitle")}</h2>
          {transactions.length ? (
            <ul className="mt-4 divide-y divide-neutral-100 text-sm">
              {transactions.map((tx, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-3">
                  <span>
                    <span className="font-medium text-neutral-900">{tx.project ?? tx.area}</span>
                    <span className="block text-xs text-neutral-500">
                      {formatDate(tx.date, locale)} · {tx.area}
                      {tx.rooms && ` · ${tx.rooms}`} · {formatNumber(Math.round(tx.sqm / SQM_PER_SQFT), locale)} ft²
                    </span>
                  </span>
                  <bdi className="shrink-0 font-semibold text-neutral-900">{formatMoney(tx.worth, "AED", locale)}</bdi>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">{t("feedEmpty")}</p>
          )}
        </div>
        <RentVsBuy model={current} />
      </section>
    </div>
  )
}

/** Cumulative cost of renting versus buying the same home with a mortgage. */
function RentVsBuy({ model }: { model?: CommunityModel }) {
  const t = useTranslations("intel.dataRoom.rentVsBuy")
  const locale = useLocale() as Locale
  const [sqft, setSqft] = useState(1000)
  const [years, setYears] = useState(5)
  if (!model) return null
  const price = model.pricePerSqft * sqft
  const rent = price * model.grossYield
  const loan = price * 0.8
  const rate = 0.045
  const payment = (loan * rate) / (1 - (1 + rate) ** -25)
  let balance = loan
  let value = price
  let rentTotal = 0
  let interest = 0
  for (let y = 0; y < years; y++) {
    rentTotal += rent * 1.03 ** y
    const i = balance * rate
    interest += i
    balance = balance + i - payment
    value *= 1 + model.growth
  }
  const buyingCosts = price * 0.07
  const ownCosts = interest + buyingCosts + sqft * 16 * years + value * 0.02 - (value - price)
  const aed = (n: number) => formatMoney(n, "AED", locale)
  const better = ownCosts < rentTotal ? "buy" : "rent"

  return (
    <div className="rounded-3xl bg-navy-900 p-6 text-white md:p-8">
      <h2 className="text-xl font-semibold">{t("title", { community: model.name })}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 [&_label]:text-white/80 [&_input]:text-neutral-900">
        <NumberField label={t("size")} value={sqft} onChange={setSqft} step={50} min={300} suffix="ft²" />
        <NumberField label={t("years")} value={years} onChange={setYears} min={1} max={25} />
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-white/60">{t("rentCost")}</dt>
          <dd className="mt-1 text-2xl font-bold">
            <bdi>{aed(rentTotal)}</bdi>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-white/60">{t("buyCost")}</dt>
          <dd className="mt-1 text-2xl font-bold">
            <bdi>{aed(ownCosts)}</bdi>
          </dd>
        </div>
      </dl>
      <p className="mt-6 font-semibold text-rose-300">{t(better === "buy" ? "buyWins" : "rentWins", { years })}</p>
      <p className="mt-3 text-xs text-white/50">{t("assumptions")}</p>
    </div>
  )
}
