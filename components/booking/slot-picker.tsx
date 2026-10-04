"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { DUBAI_TZ, workingDays } from "@/lib/booking/slots"
import { intlLocale } from "@/lib/format"
import { cn } from "@/lib/utils"

type Slot = { start: string; advisor: string }

/** Day strip plus time grid, in the visitor's timezone with Dubai time alongside. */
export function SlotPicker({
  load,
  value,
  onChange,
  timezone,
  schedule,
}: {
  load: (day: string) => Promise<Slot[]>
  schedule: { daysAhead: number; openWeekdays: number[] }
  value?: string
  onChange: (start: string) => void
  timezone: string
}) {
  const t = useTranslations("booking.steps.time")
  const locale = useLocale() as Locale
  const [now, setNow] = useState<Date | null>(null)
  const [day, setDay] = useState<string>()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => setNow(new Date()), [])
  const days = useMemo(() => (now ? workingDays(now, schedule.daysAhead, schedule.openWeekdays) : []), [now, schedule.daysAhead, schedule.openWeekdays])
  const active = day ?? days[0]

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    load(active)
      .then((list) => !cancelled && setSlots(list))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [active, load])

  const fmt = useMemo(() => {
    const tag = intlLocale(locale)
    return {
      dayName: new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }),
      dayNum: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }),
      time: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: timezone }),
      dubai: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: DUBAI_TZ }),
    }
  }, [locale, timezone])

  return (
    <div>
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2" data-lenis-prevent-horizontal role="listbox" aria-label={t("title")}>
        {days.map((d) => {
          const date = new Date(`${d}T12:00:00Z`)
          return (
            <button
              key={d}
              type="button"
              role="option"
              aria-selected={d === active}
              onClick={() => setDay(d)}
              className={cn(
                "flex w-20 shrink-0 flex-col items-center rounded-2xl border py-3",
                d === active ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700 hover:border-rose-300",
              )}
            >
              <span className="text-xs">{fmt.dayName.format(date)}</span>
              <span className="mt-1 text-sm font-semibold">{fmt.dayNum.format(date)}</span>
            </button>
          )
        })}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-neutral-600">{t("noSlots")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {slots.map(({ start }) => {
            const s = new Date(start)
            const selected = value === start
            return (
              <button
                key={start}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(start)}
                className={cn("rounded-xl border px-3 py-3 text-center", selected ? "border-rose-500 bg-rose-500 text-white" : "border-neutral-200 text-neutral-900 hover:border-rose-300")}
              >
                <span className="block font-semibold">{fmt.time.format(s)}</span>
                {timezone !== DUBAI_TZ && <span className={cn("mt-0.5 block text-xs", selected ? "text-white/80" : "text-neutral-500")}>{t("dubaiTime", { time: fmt.dubai.format(s) })}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
