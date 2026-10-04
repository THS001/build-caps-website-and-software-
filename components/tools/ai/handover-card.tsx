import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { ProgressPoint } from "@/lib/data/types"
import type { HandoverScore } from "@/lib/insights/handover"
import { formatDate, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
  name: string
  href?: string
  meta: string
  handover: string
  score: HandoverScore
  progress: ProgressPoint[]
  className?: string
}

/** One project's Handover Truth Score: probability ring, schedule bars, factors and construction pulse. */
export function HandoverCard({ name, href, meta, handover, score, progress, className }: Props) {
  const t = useTranslations("intel.handover")
  const locale = useLocale() as Locale
  const pct = Math.round(score.probability * 100)
  const tone = pct >= 70 ? "text-emerald-600" : pct >= 45 ? "text-amber-600" : "text-red-600"
  const r = 34
  const circ = 2 * Math.PI * r

  return (
    <article className={cn("rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8", className)}>
      <div className="flex items-start gap-5">
        <div className="relative h-20 w-20 shrink-0" role="img" aria-label={t("probabilityLabel", { value: pct })}>
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f1f1" strokeWidth="8" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`} className={tone} />
          </svg>
          <span className={cn("absolute inset-0 flex items-center justify-center text-xl font-bold", tone)}>{pct}%</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-neutral-900">{href ? <a href={href} className="hover:text-rose-700">{name}</a> : name}</h3>
          <p className="mt-1 text-sm text-neutral-500">{meta}</p>
          <p className="mt-2 text-sm text-neutral-700">{t("onTime", { date: formatDate(handover, locale, { month: "long", year: "numeric" }) })}</p>
          <p className="mt-1 text-xs text-neutral-500">{t(`confidence.${score.confidence}`)}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        {(["actualProgress", "expectedProgress"] as const).map((k) => (
          <div key={k}>
            <div className="flex justify-between text-neutral-600">
              <span>{t(k)}</span>
              <span className="font-medium text-neutral-900">{formatPercent(score[k], locale, 0)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-neutral-100">
              <div className={cn("h-2 rounded-full", k === "actualProgress" ? "bg-rose-400" : "bg-navy-700/40")} style={{ width: `${Math.round(score[k] * 100)}%` }} />
            </div>
          </div>
        ))}
        {score.delayMonths > 0 && <p className="text-amber-700">{t("delay", { months: score.delayMonths })}</p>}
      </div>

      <ul className="mt-6 space-y-2 text-sm">
        {score.factors.map((f) => {
          const Icon = f.effect > 0.05 ? ArrowUpRight : f.effect < -0.05 ? ArrowDownRight : ArrowRight
          return (
            <li key={f.key} className="flex items-start gap-2">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", f.effect > 0.05 ? "text-emerald-600" : f.effect < -0.05 ? "text-red-600" : "text-neutral-400")} />
              <span className="text-neutral-700">{t(`factors.${f.key}`, f.detail)}</span>
            </li>
          )
        })}
      </ul>

      {progress.length >= 2 && <Pulse points={progress} label={t("pulse")} />}
    </article>
  )
}

/** Construction pulse: recorded progress over time. */
function Pulse({ points, label }: { points: ProgressPoint[]; label: string }) {
  const sorted = [...points].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn))
  const t0 = new Date(sorted[0].recordedOn).getTime()
  const t1 = new Date(sorted[sorted.length - 1].recordedOn).getTime()
  const path = sorted.map((p) => `${((new Date(p.recordedOn).getTime() - t0) / Math.max(1, t1 - t0)) * 200},${40 - p.progress * 40}`).join(" ")
  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <svg viewBox="-2 -2 204 44" className="mt-2 h-12 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline points={path} fill="none" stroke="#b76e79" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
