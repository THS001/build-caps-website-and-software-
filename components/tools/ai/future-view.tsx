"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { skylineAction, type SkylineData } from "@/app/actions/intel"
import type { ToolProperty } from "@/lib/insights/types"
import { formatMoney, formatNumber, formatPercent } from "@/lib/format"
import { NumberField } from "@/components/tools/ui"
import { Choice, Explain, SelectField, Stat } from "@/components/tools/ai/common"
import type { Facing, Metrics } from "@/components/tools/ai/skyline-scene"

const Scene = dynamic(() => import("./skyline-scene"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-sand-100" /> })

// Extra cooling from direct sun through the windows (rough, shown as an assumption):
// 15 m² glazing × 0.5 kW/m² × 0.35 solar gain ÷ COP 3, at AED 0.38 per kWh.
const AED_PER_SUN_HOUR_MONTH = 15 * 0.5 * 0.35 / 3 * 30 * 0.38

export function FutureView({ properties }: { properties: ToolProperty[] }) {
  const t = useTranslations("intel.futureView")
  const locale = useLocale() as Locale
  const params = useSearchParams()
  const [slug, setSlug] = useState(params.get("property") ?? properties[0]?.slug ?? "")
  const [floor, setFloor] = useState(20)
  const [facing, setFacing] = useState<Facing>("NW")
  const [future, setFuture] = useState(true)
  const [day, setDay] = useState<"summer" | "equinox" | "winter">("summer")
  const [hour, setHour] = useState(16)
  const [mode, setMode] = useState<"window" | "overview">("overview")
  const [data, setData] = useState<SkylineData | null | undefined>(undefined)
  const [metrics, setMetrics] = useState<{ today: Metrics; future: Metrics } | null>(null)
  const [pending, start] = useTransition()
  const property = properties.find((p) => p.slug === slug)
  const lat = property?.geo.lat
  const lng = property?.geo.lng
  const origin = useMemo(() => (lat !== undefined && lng !== undefined ? { lat, lng } : null), [lat, lng])

  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!origin) return
    setMetrics(null)
    setData(undefined)
    start(async () => {
      const result = await skylineAction({ ...origin, exclude: property?.projectSlug ?? undefined }).catch(() => null)
      // No buildings means the map service didn't answer; never measure an empty scene as "100% open".
      setData(result && result.buildings.length ? result : null)
    })
  }, [origin, property?.projectSlug, attempt])

  const onMetrics = useCallback((today: Metrics, fut: Metrics) => setMetrics({ today, future: fut }), [])
  const risk = metrics && metrics.today.openness > 0 ? Math.max(0, (metrics.today.openness - metrics.future.openness) / metrics.today.openness) : 0
  const facings: Facing[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-2">
        <SelectField label={t("unit")} value={slug} onChange={setSlug}>
          {properties.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </SelectField>
        <NumberField label={t("floor")} value={floor} onChange={(v) => setFloor(Math.min(120, Math.max(0, Math.round(v))))} min={0} max={120} />
        <SelectField label={t("facing")} value={facing} onChange={(v) => setFacing(v as Facing)}>
          {facings.map((f) => (
            <option key={f} value={f}>
              {t(`directions.${f}`)}
            </option>
          ))}
        </SelectField>
        <Choice label={t("scenario")} value={future ? "future" : "today"} onChange={(v) => setFuture(v === "future")} options={[{ value: "today", label: t("today") }, { value: "future", label: t("inFive") }]} />
        <Choice label={t("camera")} value={mode} onChange={setMode} options={[{ value: "overview", label: t("overview") }, { value: "window", label: t("window") }]} />
        <Choice label={t("day")} value={day} onChange={setDay} options={(["summer", "equinox", "winter"] as const).map((d) => ({ value: d, label: t(`days.${d}`) }))} />
        <label className="block text-sm font-medium text-neutral-700">
          {t("hour", { hour: `${String(Math.floor(hour)).padStart(2, "0")}:00` })}
          <input type="range" min={6} max={19} step={1} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="mt-2 w-full accent-rose-500" />
        </label>
      </div>

      <div className="space-y-6 lg:col-span-3">
        <div className="relative h-[420px] overflow-hidden rounded-3xl ring-1 ring-neutral-200 md:h-[520px]">
          {data && origin ? (
            <Scene data={data} origin={origin} floor={floor} facing={facing} future={future} day={day} hour={hour} mode={mode} onMetrics={onMetrics} />
          ) : (
            <div className="flex h-full items-center justify-center bg-sand-100 text-sm text-neutral-600">
              {pending || data === undefined ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="px-6 text-center">
                  {t("noData")}
                  <button type="button" onClick={() => setAttempt((a) => a + 1)} className="ms-2 font-semibold text-neutral-900 underline">
                    {t("retry")}
                  </button>
                </span>
              )}
            </div>
          )}
          {data && <p className="absolute bottom-2 start-3 rounded bg-white/80 px-2 py-0.5 text-[10px] text-neutral-600">© OpenStreetMap contributors</p>}
        </div>

        <div className="rounded-3xl bg-navy-900 p-6 text-white md:p-8" aria-live="polite">
          {metrics && data ? (
            <>
              <div className="grid gap-6 sm:grid-cols-3">
                <Stat label={t("openToday")} value={formatPercent(metrics.today.openness, locale, 0)} hint={t("openFuture", { value: formatPercent(metrics.future.openness, locale, 0) })} />
                <Stat label={t("risk")} value={formatPercent(risk, locale, 0)} hint={t(risk > 0.25 ? "riskHigh" : risk > 0.08 ? "riskMedium" : "riskLow")} accent />
                <Stat label={t("sun")} value={t("hours", { hours: formatNumber(metrics.future.sunHours, locale, { maximumFractionDigits: 1 }) })} hint={t("cooling", { amount: formatMoney(metrics.future.sunHours * AED_PER_SUN_HOUR_MONTH, "AED", locale, { compact: false }) })} />
              </div>
              <p className="mt-6 text-xs text-white/60">{t("method", { count: data?.announced.length ?? 0 })}</p>
              <Explain kind="futureView" facts={{ floor, facing, day, viewOpennessToday: metrics.today.openness, viewOpennessInFiveYears: metrics.future.openness, viewBlockedRisk: risk, directSunHoursToday: metrics.today.sunHours, directSunHoursInFiveYears: metrics.future.sunHours, announcedTowersNearby: data?.announced.map((a) => ({ name: a.name, heightM: Math.round(a.height), handover: a.handoverYear })) }} />
            </>
          ) : (
            <p className="text-white/70">{data === null ? t("noData") : t("measuring")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
