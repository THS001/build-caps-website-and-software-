"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { estimateAction, type EstimateResult } from "@/app/actions/intel"
import { formatDate, formatMoney, formatNumber } from "@/lib/format"
import { NumberField } from "@/components/tools/ui"
import { Explain, SelectField, Stat, ToolLayout } from "@/components/tools/ai/common"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { communities: { slug: string; name: string }[] }

export function EstimateTool({ communities }: Props) {
  const t = useTranslations("intel.estimate")
  const locale = useLocale() as Locale
  const params = useSearchParams()
  const [community, setCommunity] = useState(params.get("community") ?? communities[0]?.slug ?? "")
  const [beds, setBeds] = useState(Number(params.get("beds") ?? 1))
  const [sqft, setSqft] = useState(Number(params.get("sqft") ?? 850))
  const [result, setResult] = useState<EstimateResult | null | undefined>(undefined)
  const [pending, start] = useTransition()

  const run = () => start(async () => setResult(await estimateAction({ community, beds, sqft }).catch(() => null)))
  useEffect(() => {
    if (params.get("community")) run()
    // Runs once when arriving from a listing with the details prefilled.
  }, [])

  const aed = (n: number) => formatMoney(n, "AED", locale, { compact: false })
  const name = communities.find((c) => c.slug === community)?.name ?? community

  return (
    <ToolLayout
      inputs={
        <>
          <SelectField label={t("community")} value={community} onChange={setCommunity}>
            {communities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField label={t("beds")} value={String(beds)} onChange={(v) => setBeds(Number(v))}>
            {[0, 1, 2, 3, 4, 5, 6].map((b) => (
              <option key={b} value={b}>
                {b === 0 ? t("studio") : t("bedsOption", { count: b })}
              </option>
            ))}
          </SelectField>
          <NumberField label={t("size")} value={sqft} onChange={setSqft} step={25} min={150} suffix="ft²" />
          <button type="button" onClick={run} disabled={pending || !community || sqft < 150} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("cta")}
          </button>
        </>
      }
      results={
        result === undefined ? (
          <p className="text-white/70">{t("empty")}</p>
        ) : result === null ? (
          <p className="text-white/70">{t("noData")}</p>
        ) : (
          <div>
            <Stat label={t("range")} value={<bdi>{`${formatMoney(result.low, "AED", locale)} – ${formatMoney(result.high, "AED", locale)}`}</bdi>} accent />
            <div className="mt-8" dir="ltr">
              <div className="relative h-2 rounded-full bg-gradient-to-r from-white/15 via-rose-400/70 to-white/15">
                <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-navy-900 bg-rose-300" style={{ left: `${((result.mid - result.low) / Math.max(1, result.high - result.low)) * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60">
                <bdi>{aed(result.low)}</bdi>
                <bdi className="font-semibold text-white">{aed(result.mid)}</bdi>
                <bdi>{aed(result.high)}</bdi>
              </div>
            </div>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-white/60">{t("perSqft")}</dt>
                <dd className="mt-1 font-semibold">
                  <bdi>{formatMoney(result.pricePerSqft, "AED", locale, { compact: false })}</bdi>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">{t("confidence")}</dt>
                <dd className="mt-1 font-semibold">{t(`confidenceLevels.${result.confidence}`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">{t("latest")}</dt>
                <dd className="mt-1 font-semibold">{result.latest ? formatDate(result.latest, locale) : "—"}</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-white/70">
              {result.basis === "community" ? t("basisCommunity", { community: name }) : t(result.basis === "exact" ? "basisExact" : "basisAnyRooms", { count: formatNumber(result.sales, locale), community: name })}
            </p>
            <Explain kind="estimate" facts={{ community: name, beds, sqft, ...result }} />
            <TransitionLink href="/book?purpose=valuation" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-neutral-900">
              {t("book")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </TransitionLink>
          </div>
        )
      }
    />
  )
}
