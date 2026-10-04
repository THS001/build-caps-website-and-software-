"use client"

import { useActionState } from "react"
import { Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { submitEnquiry, type LeadState } from "@/app/actions/leads"
import { NativeSelect } from "@/components/site/native-select"
import { Turnstile } from "@/components/site/turnstile"
import { TrackOn } from "@/components/site/track-on"

const interests = ["buy", "rent", "sell", "valuation", "mortgage", "goldenVisa", "general"] as const

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"

/** Contact / enquiry form. `source` records where the lead came from (page or listing). */
export function EnquiryForm({ source, defaultInterest = "buy", defaultMessage }: { source: string; defaultInterest?: (typeof interests)[number]; defaultMessage?: string }) {
  const t = useTranslations("contact.form")
  const locale = useLocale()
  const [state, action, pending] = useActionState<LeadState, FormData>(submitEnquiry, { status: "idle" })

  if (state.status === "success") {
    return (
      <>
        <TrackOn when event="lead" params={{ form: "enquiry", source }} />
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-sand-100 p-6 font-medium text-neutral-900">
          <Check className="h-5 w-5 shrink-0 text-rose-500" />
          {t("success")}
        </p>
      </>
    )
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      <input name="name" required autoComplete="name" placeholder={t("name")} aria-label={t("name")} className={inputClass} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="email" type="email" required autoComplete="email" placeholder={t("email")} aria-label={t("email")} className={inputClass} />
        <input name="phone" type="tel" autoComplete="tel" dir="ltr" placeholder={t("phone")} aria-label={t("phone")} className={`${inputClass} rtl:text-end`} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-500">{t("interest")}</span>
        <NativeSelect name="interest" defaultValue={defaultInterest} className="h-12">
          {interests.map((i) => (
            <option key={i} value={i}>
              {t(`interests.${i}`)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <textarea
        name="message"
        rows={4}
        defaultValue={defaultMessage}
        placeholder={t("message")}
        aria-label={t("message")}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
      />
      <Turnstile />
      {state.status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-neutral-900 font-semibold text-white transition-opacity disabled:opacity-60">
        {t("submit")}
      </button>
    </form>
  )
}
