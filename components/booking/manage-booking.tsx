"use client"

import { useCallback, useState, useTransition } from "react"
import { CalendarCheck, CalendarX, Video } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { cancelBooking, fetchRescheduleSlots, rescheduleBooking } from "@/app/actions/booking"
import { intlLocale } from "@/lib/format"
import { SlotPicker } from "@/components/booking/slot-picker"
import { TransitionLink } from "@/components/motion/view-transitions"

export type ManageView = {
  token: string
  reference: string
  purpose: string
  mode: string
  startsAt: string
  timezone: string
  advisor: string
  meetingUrl: string | null
  status: string
}

export function ManageBooking({ booking, schedule }: { booking: ManageView; schedule: { daysAhead: number; openWeekdays: number[] } }) {
  const t = useTranslations("booking")
  const locale = useLocale() as Locale
  const [state, setState] = useState<"view" | "reschedule" | "cancelled" | "moved">("view")
  const [start, setStart] = useState(booking.startsAt)
  const [picked, setPicked] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  const load = useCallback((day: string) => fetchRescheduleSlots(booking.token, day), [booking.token])
  const long = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "full", timeStyle: "short", timeZone: booking.timezone })
  const past = new Date(start).getTime() < Date.now()

  if (booking.status !== "confirmed" || state === "cancelled") {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-center ring-1 ring-neutral-200 md:p-12">
        <CalendarX className="mx-auto h-10 w-10 text-rose-500" />
        <p className="mt-4 text-xl font-semibold text-neutral-900">{t("manage.cancelled")}</p>
        <TransitionLink href="/book" className="mt-6 inline-flex rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white">
          {t("title")}
        </TransitionLink>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 ring-1 ring-neutral-200 md:p-10">
        <p className="text-label text-rose-700">{t("manage.details")}</p>
        <p className="mt-3 text-2xl font-semibold text-neutral-900">{t(`steps.purpose.options.${booking.purpose}.label`)}</p>
        <p className="mt-2 flex items-center gap-2 text-neutral-700">
          <CalendarCheck className="h-5 w-5 text-rose-500" />
          {long.format(new Date(start))}
        </p>
        <p className="mt-1 text-neutral-600">
          {t(`steps.mode.options.${booking.mode}.label`)} · {booking.advisor} · {t("confirmed.reference", { id: booking.reference })}
        </p>
        {booking.meetingUrl && (
          <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-rose-700 underline">
            <Video className="h-4 w-4" />
            {booking.meetingUrl}
          </a>
        )}
        {state === "moved" && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{t("manage.rescheduled")}</p>}
        {past ? (
          <p className="mt-6 text-neutral-500">{t("manage.past")}</p>
        ) : (
          state !== "reschedule" && (
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setState("reschedule")} className="rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white">
                {t("manage.reschedule")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(t("manage.cancelConfirm"))) return
                  startTransition(async () => {
                    const res = await cancelBooking(booking.token)
                    if (res.ok) setState("cancelled")
                    else setError(t("errors.generic"))
                  })
                }}
                className="rounded-full px-6 py-3 font-semibold text-red-700 ring-1 ring-red-200"
              >
                {t("manage.cancel")}
              </button>
            </div>
          )
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {state === "reschedule" && (
        <div className="rounded-[2rem] bg-white p-8 ring-1 ring-neutral-200 md:p-10">
          <p className="mb-6 text-xl font-semibold text-neutral-900">{t("manage.pickNewTime")}</p>
          <SlotPicker load={load} value={picked} onChange={setPicked} timezone={booking.timezone} schedule={schedule} />
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!picked || pending}
              onClick={() =>
                picked &&
                startTransition(async () => {
                  const res = await rescheduleBooking(booking.token, picked)
                  if (res.ok) {
                    setStart(picked)
                    setPicked(undefined)
                    setState("moved")
                  } else setError(res.reason === "slotTaken" ? t("errors.slotTaken") : t("errors.generic"))
                })
              }
              className="rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
            >
              {pending ? "…" : t("manage.reschedule")}
            </button>
            <button type="button" onClick={() => setState("view")} className="rounded-full px-6 py-3 font-semibold text-neutral-700">
              {t("manage.keep")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
