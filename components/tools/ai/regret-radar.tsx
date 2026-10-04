"use client"

import { useMemo, useState } from "react"
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { CommunityModel } from "@/lib/insights/types"
import { hindsight, regretRadar } from "@/lib/insights/regret"
import { formatMoney, formatPercent } from "@/lib/format"
import { NumberField } from "@/components/tools/ui"
import { BasisNote, Choice, Explain, SelectField, Stat, ToolLayout } from "@/components/tools/ai/common"
import { cn } from "@/lib/utils"

export function RegretRadar({ model }: { model: CommunityModel[] }) {
  const t = useTranslations("intel.regretRadar")
  const locale = useLocale() as Locale
  const [community, setCommunity] = useState(model[0]?.slug ?? "")
  const c = model.find((m) => m.slug === community) ?? model[0]
  const years = c ? c.history.slice(0, -1).map((h) => h.year) : []
  const [year, setYear] = useState(years.includes(2019) ? 2019 : years[0])
  const [amount, setAmount] = useState(1_500_000)
  const past = c && year ? hindsight(c, model, year, amount) : null

  const [picked, setPicked] = useState<string[]>(model.slice(0, 3).map((m) => m.slug))
  const [horizon, setHorizon] = useState<"5" | "10">("10")
  const radar = useMemo(() => {
    const options = model.filter((m) => picked.includes(m.slug)).map((m) => ({ id: m.slug, label: m.name, growth: m.growth, volatility: m.volatility, grossYield: m.grossYield }))
    return options.length >= 2 ? regretRadar(options, { years: Number(horizon) }) : []
  }, [model, picked, horizon])
  const safest = radar.length ? radar.reduce((a, b) => (b.regret < a.regret ? b : a)) : null
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length >= 4 ? p : [...p, slug]))
  const aed = (n: number) => formatMoney(n, "AED", locale)

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("pastTitle")}</h2>
        <ToolLayout
          inputs={
            <>
              <SelectField label={t("community")} value={community} onChange={setCommunity}>
                {model.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label={t("year")} value={String(year)} onChange={(v) => setYear(Number(v))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </SelectField>
              <NumberField label={t("amount")} value={amount} onChange={setAmount} step={100_000} suffix="AED" />
            </>
          }
          results={
            past && c ? (
              <div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Stat label={t("worthNow")} value={<bdi>{aed(past.valueNow + past.rentEarned - past.buyingCosts)}</bdi>} hint={t("worthHint")} accent />
                  <Stat label={t("perYear")} value={formatPercent(past.cagr, locale)} hint={t("years", { years: past.years })} />
                </div>
                <dl className="mt-6 space-y-2 text-sm">
                  {[
                    [t("valueNow"), aed(past.valueNow)],
                    [t("rent"), aed(past.rentEarned)],
                    [t("costs"), aed(-past.buyingCosts)],
                    [t("gain"), aed(past.gain)],
                    [t("dubaiAverage"), aed(past.dubaiGain)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <dt className="text-white/70">{k}</dt>
                      <dd className="font-semibold">
                        <bdi>{v}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 h-40" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={c.history}>
                      <XAxis dataKey="year" stroke="rgba(255,255,255,.5)" tick={{ fontSize: 11 }} />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip formatter={(v: number) => formatMoney(v, "AED", locale, { compact: false })} contentStyle={{ color: "#111" }} />
                      <ReferenceLine x={year} stroke="#e7b6bd" strokeDasharray="3 3" />
                      <Line dataKey="pricePerSqft" name={t("perSqft")} stroke="#e7b6bd" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <BasisNote basis={c.basis} className="mt-3 !text-white/50" />
              </div>
            ) : (
              <p className="text-white/70">{t("noHistory")}</p>
            )
          }
        />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold text-neutral-900">{t("radarTitle")}</h2>
        <p className="mb-6 max-w-2xl text-neutral-600">{t("radarBody")}</p>
        <ToolLayout
          inputs={
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-neutral-700">{t("options")}</legend>
                <div className="flex flex-wrap gap-2">
                  {model.map((m) => (
                    <button key={m.slug} type="button" aria-pressed={picked.includes(m.slug)} onClick={() => toggle(m.slug)} className={cn("rounded-full border px-3 py-1.5 text-sm", picked.includes(m.slug) ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700")}>
                      {m.name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-500">{t("optionsHint")}</p>
              </fieldset>
              <Choice label={t("horizon")} value={horizon} onChange={setHorizon} options={[{ value: "5", label: t("years", { years: 5 }) }, { value: "10", label: t("years", { years: 10 }) }]} />
            </>
          }
          results={
            radar.length ? (
              <div>
                {safest && <Stat label={t("leastRegret")} value={safest.label} hint={t("regretChance", { value: formatPercent(safest.regret, locale, 0) })} accent />}
                <div className="mt-8 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="text-xs uppercase tracking-wide text-white/50">
                      <tr>
                        <th className="py-2 text-start font-medium">{t("option")}</th>
                        <th className="py-2 text-end font-medium">{t("median")}</th>
                        <th className="py-2 text-end font-medium">{t("range")}</th>
                        <th className="py-2 text-end font-medium">{t("loss")}</th>
                        <th className="py-2 text-end font-medium">{t("regret")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {radar.map((r) => (
                        <tr key={r.id} className="border-t border-white/10">
                          <td className="py-3">{r.label}</td>
                          <td className="py-3 text-end">{formatPercent(r.median, locale, 0)}</td>
                          <td className="py-3 text-end text-white/70">
                            <bdi>{`${formatPercent(r.p10, locale, 0)} – ${formatPercent(r.p90, locale, 0)}`}</bdi>
                          </td>
                          <td className="py-3 text-end">{formatPercent(r.lossChance, locale, 0)}</td>
                          <td className={cn("py-3 text-end font-semibold", r.id === safest?.id && "text-rose-300")}>{formatPercent(r.regret, locale, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-white/60">{t("method", { years: horizon })}</p>
                <Explain kind="regret" facts={{ horizonYears: Number(horizon), regretMeans: "chance of trailing the best other option by more than 20 points of total return", options: radar.map((r) => ({ option: r.label, medianTotalReturn: r.median, p10: r.p10, p90: r.p90, lossChance: r.lossChance, regretChance: r.regret })) }} />
              </div>
            ) : (
              <p className="text-white/70">{t("pickTwo")}</p>
            )
          }
        />
      </section>
    </div>
  )
}
