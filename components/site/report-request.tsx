"use client"

import { useActionState } from "react"
import { Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { requestGuide, type LeadState } from "@/app/actions/leads"
import { Turnstile } from "@/components/site/turnstile"
import { TrackOn } from "@/components/site/track-on"

/** Email gate for a market report. */
export function ReportRequest({ slug }: { slug: string }) {
  const t = useTranslations("reports")
  const tl = useTranslations("leadMagnet")
  const locale = useLocale()
  const [state, action, pending] = useActionState<LeadState, FormData>(requestGuide, { status: "idle" })

  if (state.status === "success") {
    return (
      <>
        <TrackOn when event="lead" params={{ form: "report" }} />
        <p role="status" className="flex flex-wrap items-center gap-3 font-medium text-neutral-900">
          <Check className="h-5 w-5 text-rose-500" />
          {state.url ? tl("ready") : tl("success")}
          {state.url && (
            <a href={state.url} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
              {tl("downloadNow")}
            </a>
          )}
        </p>
      </>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={`report:${slug}`} />
      <label className="flex-1">
        <span className="sr-only">{tl("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={tl("email")}
          aria-invalid={state.status === "error"}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        />
      </label>
      <Turnstile />
      <button type="submit" disabled={pending} className="h-12 shrink-0 rounded-xl bg-neutral-900 px-6 font-semibold text-white disabled:opacity-60">
        {t("download")}
      </button>
    </form>
  )
}
