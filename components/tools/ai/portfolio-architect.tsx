"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel, ToolProperty } from "@/lib/insights/types"
import { architect, type Goal } from "@/lib/insights/portfolio"
import { formatMoney, formatNumber, formatPercent } from "@/lib/format"
import { NumberField, Toggle } from "@/components/tools/ui"
import { Choice, Explain, Stat, ToolLayout } from "@/components/tools/ai/common"
import { TransitionLink } from "@/components/motion/view-transitions"

export function PortfolioArchitect({ model, properties }: { model: CommunityModel[]; properties: ToolProperty[] }) {
  const t = useTranslations("intel.portfolio")
  const locale = useLocale() as Locale
  const [budget, setBudget] = useState(5_000_000)
  const [maxUnits, setMaxUnits] = useState<"2" | "3" | "4">("3")
  const [goal, setGoal] = useState<Goal>("balanced")
  const [offPlan, setOffPlan] = useState(true)
  const all = useMemo(() => architect(properties, model, { budget, maxUnits: Number(maxUnits), includeOffPlan: offPlan }), [properties, model, budget, maxUnits, offPlan])
  const p = all[goal]
  const names = new Map(model.map((m) => [m.slug, m.name]))
  const aed = (n: number) => formatMoney(n, "AED", locale)
  const thisYear = new Date().getFullYear()

  return (
    <ToolLayout
      inputs={
        <>
          <NumberField label={t("budget")} value={budget} onChange={setBudget} step={250_000} min={500_000} suffix="AED" />
          <Choice label={t("goal")} value={goal} onChange={setGoal} options={(["income", "balanced", "growth"] as const).map((g) => ({ value: g, label: t(`goals.${g}`) }))} />
          <Choice label={t("units")} value={maxUnits} onChange={setMaxUnits} options={(["2", "3", "4"] as const).map((n) => ({ value: n, label: t("upToUnits", { count: Number(n) }) }))} />
          <Toggle label={t("offPlan")} checked={offPlan} onChange={setOffPlan} />
        </>
      }
      results={
        p ? (
          <div>
            <div className="grid gap-6 sm:grid-cols-3">
              <Stat label={t("income")} value={formatPercent(p.incomeYield, locale)} hint={t("incomeHint")} accent />
              <Stat label={t("growth")} value={formatPercent(p.growth, locale)} hint={t("growthHint")} />
              <Stat label={t("risk")} value={formatPercent(p.risk, locale, 0)} hint={t("riskHint", { ratio: formatNumber(p.diversification, locale, { maximumFractionDigits: 2 }) })} />
            </div>
            <ul className="mt-8 space-y-3">
              {p.holdings.map((h) => (
                <li key={h.property.slug} className="flex items-start justify-between gap-4 rounded-2xl bg-white/[0.06] p-4">
                  <span>
                    <TransitionLink href={`/properties/${h.property.slug}`} className="font-semibold hover:underline">
                      {h.property.title}
                    </TransitionLink>
                    <span className="mt-1 block text-xs text-white/60">
                      {names.get(h.property.communitySlug)} · {t(h.property.status === "offPlan" ? "offPlanTag" : "readyTag")}
                      {h.yearsToIncome > 0 && ` · ${t("incomeFrom", { year: thisYear + h.yearsToIncome })}`}
                    </span>
                  </span>
                  <bdi className="shrink-0 font-semibold">{aed(h.property.priceAed ?? 0)}</bdi>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-white/70">{t("total", { total: aed(p.total), share: formatPercent(p.total / budget, locale, 0) })}</p>
            <div className="mt-6 h-40" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.incomeByYear.map((v, i) => ({ year: thisYear + i, income: Math.round(v) }))}>
                  <XAxis dataKey="year" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatMoney(v, "AED", locale, { compact: false })} contentStyle={{ color: "#111" }} />
                  <Bar dataKey="income" name={t("netRent")} fill="#e7b6bd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-white/60">{t("chartNote")}</p>
            <Explain kind="portfolio" facts={{ budget, goal, holdings: p.holdings.map((h) => ({ title: h.property.title, community: names.get(h.property.communitySlug), priceAed: h.property.priceAed, status: h.property.status, netYield: h.yield, growth: h.growth, volatility: h.volatility, incomeStartsInYears: h.yearsToIncome })), incomeYield: p.incomeYield, growth: p.growth, risk: p.risk, diversificationRatio: p.diversification }} />
          </div>
        ) : (
          <p className="text-white/70">{t("none")}</p>
        )
      }
    />
  )
}
