"use client"

import { useActionState, useState } from "react"
import { Check, Loader2, Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { submitReview, type ReviewState } from "@/app/actions/booking"
import { cn } from "@/lib/utils"

const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"

/** Rate the meeting: reached only through the private link in the booking emails. */
export function ReviewForm({ token, advisor, firstName }: { token: string; advisor: string; firstName: string }) {
  const t = useTranslations("booking.review")
  const locale = useLocale()
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { status: "idle" })
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)

  if (state.status === "done") {
    return (
      <p role="status" className="flex items-center gap-2 rounded-3xl bg-sand-100 p-6 font-medium text-neutral-900">
        <Check className="h-5 w-5 shrink-0 text-rose-500" />
        {t("done")}
      </p>
    )
  }

  return (
    <form id="review" action={action} className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8">
      <h2 className="text-2xl font-semibold text-neutral-900">{t("title", { advisor })}</h2>
      <p className="text-neutral-600">{t("body")}</p>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rating" value={rating || ""} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral-700">{t("rating")}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t("stars", { count: n })}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Star className={cn("h-8 w-8 transition-colors", n <= (hover || rating) ? "fill-rose-400 text-rose-400" : "text-neutral-300")} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("comment")}</span>
        <textarea name="comment" rows={4} maxLength={1500} className={`${inputClass} py-3`} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("firstName")}</span>
        <input name="first_name" defaultValue={firstName} maxLength={60} autoComplete="given-name" className={`${inputClass} h-12`} />
      </label>
      <p className="text-xs text-neutral-500">{t("consent", { advisor })}</p>
      {state.status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
      <button disabled={pending || !rating} className="inline-flex h-12 items-center gap-2 rounded-xl bg-neutral-900 px-6 font-semibold text-white disabled:opacity-50">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("submit")}
      </button>
    </form>
  )
}
