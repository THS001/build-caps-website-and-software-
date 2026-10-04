"use client"

import { useActionState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter"
import { Turnstile } from "@/components/site/turnstile"
import { cn } from "@/lib/utils"
import { TrackOn } from "@/components/site/track-on"

export function NewsletterForm({ className }: { className?: string }) {
  const t = useTranslations("footer")
  const locale = useLocale()
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeToNewsletter, { status: "idle" })

  if (state.status === "success") {
    return (
      <>
        <TrackOn when event="lead" params={{ form: "newsletter" }} />
        <p role="status" className={cn("flex items-center gap-2 text-sm text-neutral-700", className)}>
          <Check className="h-4 w-4 shrink-0 text-rose-500" />
          {t("newsletterSuccess")}
        </p>
      </>
    )
  }

  return (
    <form action={action} className={className} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <div className="border-gradient flex items-center rounded-full bg-white/70 p-1 backdrop-blur">
        <label htmlFor="footer-newsletter-email" className="sr-only">
          {t("newsletterPlaceholder")}
        </label>
        <input
          id="footer-newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          placeholder={t("newsletterPlaceholder")}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "footer-newsletter-error" : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 rtl:text-end"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {t("newsletterCta")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
      <Turnstile className="mt-2" />
      {state.status === "error" && (
        <p id="footer-newsletter-error" className="mt-2 ps-4 text-xs text-red-600">
          {t("newsletterError")}
        </p>
      )}
    </form>
  )
}
