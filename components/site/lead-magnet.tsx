"use client"

import { useActionState } from "react"
import { Check, FileText } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { requestGuide, type LeadState } from "@/app/actions/leads"
import { Photo } from "@/components/media/photo"
import { photos } from "@/lib/media"
import { Turnstile } from "@/components/site/turnstile"
import { TrackOn } from "@/components/site/track-on"

/** Gated "2026 Dubai Investor Guide" (the secondary conversion on every page). */
export function LeadMagnet({ source }: { source: string }) {
  const t = useTranslations("leadMagnet")
  const locale = useLocale()
  const [state, action, pending] = useActionState<LeadState, FormData>(requestGuide, { status: "idle" })

  return (
    <section className="container-custom py-16 md:py-24">
      <div className="grid overflow-hidden rounded-[2rem] bg-sand-100 md:grid-cols-2">
        <div className="relative min-h-56">
          <Photo photo={photos.burjSunset} sizes="(min-width: 1024px) 50vw, 100vw" />
          <div className="absolute start-8 bottom-8 flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
            <FileText className="h-6 w-6 text-rose-500" />
            <span className="text-sm font-semibold text-neutral-900">{t("title")}</span>
          </div>
        </div>
        <div className="p-8 md:p-12">
          <p className="text-label text-rose-700">{t("eyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-neutral-900">{t("title")}</h2>
          <p className="mt-4 text-neutral-600">{t("body")}</p>
          <TrackOn when={state.status === "success"} event="lead" params={{ form: "guide", source }} />
          {state.status === "success" ? (
            <p role="status" className="mt-8 flex flex-wrap items-center gap-3 font-medium text-neutral-900">
              <Check className="h-5 w-5 text-rose-500" />
              {state.url ? t("ready") : t("success")}
              {state.url && (
                <a href={state.url} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                  {t("downloadNow")}
                </a>
              )}
            </p>
          ) : (
            <form action={action} className="mt-8 space-y-3" noValidate>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="source" value={source} />
              <label className="block">
                <span className="sr-only">{t("email")}</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t("email")}
                  aria-invalid={state.status === "error"}
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <label className="block">
                <span className="sr-only">{t("country")}</span>
                <input
                  name="country"
                  autoComplete="country-name"
                  placeholder={t("country")}
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <Turnstile />
              {state.status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
              <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-neutral-900 font-semibold text-white transition-opacity disabled:opacity-60">
                {t("cta")}
              </button>
              <p className="text-xs text-neutral-500">{t("privacy")}</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
