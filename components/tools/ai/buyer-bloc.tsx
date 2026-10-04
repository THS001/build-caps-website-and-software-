"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, Loader2, Users } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { joinBlocAction, type BlocState } from "@/app/actions/intel"
import { formatDate, formatMoney } from "@/lib/format"
import { Turnstile } from "@/components/site/turnstile"
import { cn } from "@/lib/utils"
import { TrackOn } from "@/components/site/track-on"

export type BlocLaunch = { slug: string; name: string; community: string; handover: string; launchPriceAed: number; joined: number }

/** Buyer Bloc pilot: investors register interest in a launch; Buildcaps negotiates once the bloc is big enough. */
export function BuyerBloc({ launches, target }: { launches: BlocLaunch[]; target: number }) {
  const t = useTranslations("intel.buyerBloc")
  const locale = useLocale() as Locale
  const [selected, setSelected] = useState(launches[0]?.slug ?? "")
  const [state, action, pending] = useActionState<BlocState, FormData>(joinBlocAction, { status: "idle" })
  const launch = launches.find((l) => l.slug === selected)
  const field = "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <ul className="space-y-4 lg:col-span-3">
        {launches.map((l) => {
          const share = Math.min(1, l.joined / target)
          return (
            <li key={l.slug}>
              <button type="button" onClick={() => setSelected(l.slug)} aria-pressed={selected === l.slug} className={cn("w-full rounded-3xl bg-white p-6 text-start ring-1 transition-shadow", selected === l.slug ? "ring-2 ring-rose-400" : "ring-neutral-200 hover:ring-rose-200")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-neutral-900">{l.name}</h3>
                  <span className="text-sm text-neutral-500">
                    {t("from")} <bdi>{formatMoney(l.launchPriceAed, "AED", locale)}</bdi>
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {l.community} · {t("handover", { date: formatDate(l.handover, locale, { month: "short", year: "numeric" }) })}
                </p>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500 transition-all" style={{ width: `${Math.max(3, share * 100)}%` }} />
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-neutral-700">
                  <Users className="h-4 w-4 text-rose-500" />
                  {t("progress", { joined: l.joined, target })}
                </p>
              </button>
            </li>
          )
        })}
        {!launches.length && <li className="rounded-3xl bg-white p-10 text-center text-neutral-500 ring-1 ring-neutral-200">{t("noLaunches")}</li>}
      </ul>

      <div className="lg:col-span-2">
        {state.status === "done" ? (
          <div className="rounded-3xl bg-navy-900 p-8 text-white">
            <TrackOn when event="lead" params={{ form: "buyer-bloc", project: selected }} />
            <CheckCircle2 className="h-8 w-8 text-rose-300" />
            <h2 className="mt-4 text-2xl font-semibold">{t("doneTitle")}</h2>
            <p className="mt-2 text-white/75">{t("doneBody", { project: launch?.name ?? "" })}</p>
          </div>
        ) : (
          <form action={action} className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">{t("formTitle", { project: launch?.name ?? "" })}</h2>
            <input type="hidden" name="project" value={selected} />
            <input type="hidden" name="locale" value={locale} />
            <input name="name" required minLength={2} autoComplete="name" placeholder={t("name")} aria-label={t("name")} className={field} />
            <input name="email" type="email" required autoComplete="email" placeholder={t("email")} aria-label={t("email")} className={field} />
            <input name="phone" type="tel" autoComplete="tel" placeholder={t("phone")} aria-label={t("phone")} className={field} dir="ltr" />
            <input name="country" autoComplete="country-name" placeholder={t("country")} aria-label={t("country")} className={field} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-neutral-700">
                {t("units")}
                <input name="units" type="number" min={1} max={20} defaultValue={1} className={cn(field, "mt-1")} />
              </label>
              <label className="text-sm text-neutral-700">
                {t("budget")}
                <input name="budget" type="number" min={0} step={50_000} defaultValue={launch?.launchPriceAed ?? 1_500_000} className={cn(field, "mt-1")} />
              </label>
            </div>
            <Turnstile />
            <button disabled={pending || !selected} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("cta")}
            </button>
            {state.status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
            <p className="text-xs text-neutral-500">{t("legal")}</p>
          </form>
        )}
      </div>
    </div>
  )
}
