import { BadgeCheck, Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { AdvisorReview, AdvisorScore } from "@/lib/data/types"
import { formatPercent } from "@/lib/format"

/** "★ 4.9 · Score 92" on advisor cards; nothing until the score is ready. */
export function AdvisorScoreBadge({ score }: { score?: AdvisorScore | null }) {
  const t = useTranslations("team.score")
  if (!score?.ready || score.score === null) return null
  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
      {score.rating !== null && (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
          {score.rating.toFixed(1)}
        </span>
      )}
      <span>{t("badge", { score: score.score })}</span>
    </p>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= Math.round(value) ? "h-4 w-4 fill-rose-400 text-rose-400" : "h-4 w-4 text-neutral-300"} />
      ))}
    </span>
  )
}

/** The full Advisor Score and verified reviews on the advisor's profile. */
export function AdvisorScorePanel({ name, score, reviews }: { name: string; score?: AdvisorScore | null; reviews: AdvisorReview[] }) {
  const t = useTranslations("team.score")
  const locale = useLocale() as Locale
  const first = name.split(" ")[0]
  if (!score?.ready || score.score === null) return null
  const response =
    score.responseMinutes === null ? null : score.responseMinutes < 90 ? t("minutes", { count: score.responseMinutes }) : t("hours", { count: Math.round(score.responseMinutes / 60) })

  return (
    <section className="mt-12 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8" aria-labelledby="advisor-score">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="advisor-score" className="text-2xl font-semibold text-neutral-900">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("how", { name: first })}</p>
        </div>
        <p className="text-rose-metal text-6xl font-bold">
          {score.score}
          <span className="ms-2 text-base font-medium text-neutral-500">{t("outOf")}</span>
        </p>
      </div>

      {score.summary?.[locale] && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700">{score.summary[locale] ?? score.summary.en}</p>}

      {score.strengths.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {score.strengths.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-sm text-neutral-800">
              <BadgeCheck className="h-4 w-4 text-rose-500" />
              {t(`strengths.${s}`)}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {score.rating !== null && (
          <div className="rounded-2xl bg-sand-100/70 p-4">
            <dt className="text-sm text-neutral-500">{t("rating")}</dt>
            <dd className="mt-1 flex items-center gap-2 text-xl font-semibold text-neutral-900">
              {score.rating.toFixed(1)} <Stars value={score.rating} />
            </dd>
            <dd className="text-xs text-neutral-500">{t("reviewCount", { count: score.reviews })}</dd>
          </div>
        )}
        {response && (
          <div className="rounded-2xl bg-sand-100/70 p-4">
            <dt className="text-sm text-neutral-500">{t("response")}</dt>
            <dd className="mt-1 text-xl font-semibold text-neutral-900">{response}</dd>
          </div>
        )}
        {score.showRate !== null && (
          <div className="rounded-2xl bg-sand-100/70 p-4">
            <dt className="text-sm text-neutral-500">{t("showRate")}</dt>
            <dd className="mt-1 text-xl font-semibold text-neutral-900">{formatPercent(score.showRate, locale, 0)}</dd>
          </div>
        )}
        <div className="rounded-2xl bg-sand-100/70 p-4">
          <dt className="text-sm text-neutral-500">{t("meetings")}</dt>
          <dd className="mt-1 text-xl font-semibold text-neutral-900">{score.meetings}</dd>
        </div>
      </dl>

      {reviews.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-neutral-900">{t("reviewsTitle")}</h3>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl p-5 ring-1 ring-neutral-200">
                <Stars value={r.rating} />
                {r.comment && (
                  <p className="mt-3 text-neutral-700" lang={r.locale}>
                    “{r.comment}”
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {r.firstName ?? t("client")} · {t("verified")} · {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(r.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
