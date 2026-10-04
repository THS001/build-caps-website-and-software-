"use client"

import { useEffect, useId, useState } from "react"
import { Cookie } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { OPEN_CONSENT, readConsent, writeConsent } from "@/lib/consent"

/**
 * Cookie choice. Shown until the visitor decides; "Reject" is as prominent as
 * "Accept". Reopened from the footer's "Cookie settings".
 */
export function ConsentBanner() {
  const t = useTranslations("consent")
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const titleId = useId()

  useEffect(() => {
    const current = readConsent()
    if (!current) setOpen(true)
    const reopen = () => {
      const c = readConsent()
      setAnalytics(Boolean(c?.analytics))
      setMarketing(Boolean(c?.marketing))
      setCustom(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_CONSENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT, reopen)
  }, [])

  if (!open) return null
  const save = (choice: { analytics: boolean; marketing: boolean }) => {
    writeConsent(choice)
    setOpen(false)
  }
  const toggle = (label: string, body: string, checked: boolean, onChange?: (v: boolean) => void) => (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-neutral-900">{label}</span>
        <span className="block text-xs text-neutral-500">{body}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={!onChange} onChange={(e) => onChange?.(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rose-500" />
    </label>
  )

  return (
    <section role="region" aria-labelledby={titleId} className="fixed inset-x-4 bottom-4 z-50 max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_80px_-20px_rgb(0_23_63/0.35)] ring-1 ring-neutral-200 sm:start-6 sm:end-auto sm:bottom-6">
      <h2 id={titleId} className="flex items-center gap-2 font-semibold text-neutral-900">
        <Cookie className="h-5 w-5 text-rose-500" /> {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        {t("body")}{" "}
        <Link href="/cookies" className="underline hover:text-neutral-900">
          {t("policy")}
        </Link>
      </p>
      {custom && (
        <div className="mt-4 space-y-2">
          {toggle(t("necessary"), t("necessaryBody"), true)}
          {toggle(t("analytics"), t("analyticsBody"), analytics, setAnalytics)}
          {toggle(t("marketing"), t("marketingBody"), marketing, setMarketing)}
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => save({ analytics: false, marketing: false })} className="rounded-full px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50">
          {t("reject")}
        </button>
        <button type="button" onClick={() => save({ analytics: true, marketing: true })} className="rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white">
          {t("accept")}
        </button>
      </div>
      {custom ? (
        <button type="button" onClick={() => save({ analytics, marketing })} className="mt-2 w-full rounded-full px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
          {t("save")}
        </button>
      ) : (
        <button type="button" onClick={() => setCustom(true)} className="mt-2 w-full rounded-full px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
          {t("customise")}
        </button>
      )}
    </section>
  )
}

/** "Cookie settings" link for the footer. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("consent")
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT))} className={className}>
      {t("settings")}
    </button>
  )
}
