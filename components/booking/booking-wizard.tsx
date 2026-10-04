"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { ArrowLeft, ArrowRight, Building2, CalendarCheck, Check, Home, Landmark, Languages, LineChart, MapPin, MessageCircle, Scale, Sparkles, Video } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { createBooking, fetchSlots, type BookingResult } from "@/app/actions/booking"
import { DUBAI_TZ, workingDays } from "@/lib/booking/slots"
import { Turnstile } from "@/components/site/turnstile"
import { googleCalendarUrl, icsFile, outlookCalendarUrl } from "@/lib/booking/calendar-links"
import { intlLocale } from "@/lib/format"
import { StepTransition } from "@/components/motion/step-transition"
import { fireConfetti } from "@/components/motion/confetti"
import { TransitionLink } from "@/components/motion/view-transitions"
import { NativeSelect } from "@/components/site/native-select"
import { cn } from "@/lib/utils"
import { TrackOn } from "@/components/site/track-on"
import { site, whatsappUrl } from "@/lib/site"

type Purpose = "strategy" | "viewing" | "valuation" | "mortgage" | "goldenVisa"
type Mode = "video" | "office" | "onsite" | "whatsapp"
type AgentLite = { slug: string; name: string; role: string; languages: Locale[] }

export type Schedule = { slotMinutes: number; daysAhead: number; openWeekdays: number[] }

type WizardProps = {
  agents: AgentLite[]
  /** Booking rules from Admin → Availability. */
  schedule: Schedule
  initial: { purpose?: Purpose; property?: { slug: string; title: string }; advisor?: string }
}

const STEPS = ["purpose", "context", "mode", "advisor", "time", "details"] as const
type Step = (typeof STEPS)[number]

const PURPOSES: { key: Purpose; icon: typeof Home }[] = [
  { key: "strategy", icon: LineChart },
  { key: "viewing", icon: Home },
  { key: "valuation", icon: Scale },
  { key: "mortgage", icon: Landmark },
  { key: "goldenVisa", icon: Sparkles },
]
const MODES: { key: Mode; icon: typeof Home }[] = [
  { key: "video", icon: Video },
  { key: "office", icon: Building2 },
  { key: "onsite", icon: MapPin },
  { key: "whatsapp", icon: MessageCircle },
]
const BUDGETS = ["under1m", "1to2m", "2to5m", "over5m"] as const
const TIMELINES = ["now", "soon", "later", "exploring"] as const
const ZONES = ["Asia/Dubai", "Europe/London", "Europe/Berlin", "Europe/Moscow", "Asia/Kolkata", "Asia/Karachi", "Asia/Tehran", "Asia/Shanghai", "Asia/Riyadh", "Africa/Cairo", "America/New_York", "Australia/Sydney"]

function Choice({ selected, onClick, icon: Icon, title, body }: { selected: boolean; onClick: () => void; icon: typeof Home; title: string; body?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl border p-5 text-start transition-colors",
        selected ? "border-rose-500 bg-rose-50" : "border-neutral-200 bg-white hover:border-rose-300",
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-rose-500 text-white" : "bg-neutral-100 text-neutral-700")}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold text-neutral-900">{title}</span>
        {body && <span className="mt-0.5 block text-sm text-neutral-600">{body}</span>}
      </span>
    </button>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn("rounded-full border px-4 py-2 text-sm", selected ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700 hover:border-rose-300")}
    >
      {children}
    </button>
  )
}

export function BookingWizard({ agents, schedule, initial }: WizardProps) {
  const t = useTranslations("booking")
  const tt = useTranslations("team")
  const tc = useTranslations("common")
  const locale = useLocale() as Locale
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState<Step>(initial.purpose ? "context" : "purpose")
  const [direction, setDirection] = useState<1 | -1>(1)
  const [purpose, setPurpose] = useState<Purpose | undefined>(initial.purpose)
  const [budget, setBudget] = useState<string>()
  const [timeline, setTimeline] = useState<string>()
  const [mode, setMode] = useState<Mode>()
  const [advisor, setAdvisor] = useState<string>(initial.advisor ?? "best")
  const [timezone, setTimezone] = useState(DUBAI_TZ)
  const [now, setNow] = useState<Date | null>(null)
  const [day, setDay] = useState<string>()
  const [slot, setSlot] = useState<string>()
  const [details, setDetails] = useState({ name: "", email: "", phone: "", language: locale as string, notes: "", consent: false })
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<Extract<BookingResult, { status: "success" }>>()
  const [slots, setSlots] = useState<{ start: string; advisor: string }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [human, setHuman] = useState<string>()

  // Time-dependent values are computed after mount, so server and client render the same markup.
  useEffect(() => {
    setNow(new Date())
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || DUBAI_TZ)
  }, [])

  const index = STEPS.indexOf(step)
  const go = (next: Step, dir: 1 | -1 = 1) => {
    setDirection(dir)
    setError(undefined)
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const back = () => index > 0 && go(STEPS[index - 1], -1)

  // Best match: an advisor who speaks the visitor's language; directors only when no advisor does.
  const advisors = useMemo(() => agents.filter((a) => a.role !== "ceo"), [agents])
  const bestMatch = useMemo(() => {
    const speaks = advisors.filter((a) => a.languages.includes(locale))
    return speaks.find((a) => a.role !== "salesDirector") ?? speaks[0] ?? advisors[0]
  }, [advisors, locale])
  const days = useMemo(() => (now ? workingDays(now, schedule.daysAhead, schedule.openWeekdays) : []), [now, schedule.daysAhead, schedule.openWeekdays])
  const activeDay = day ?? days[0]

  // Live availability from the server (advisor hours, time off and existing bookings).
  useEffect(() => {
    if (step !== "time" || !activeDay) return
    let cancelled = false
    setLoadingSlots(true)
    fetchSlots({ advisor, day: activeDay, language: locale })
      .then((list) => !cancelled && setSlots(list))
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoadingSlots(false))
    return () => {
      cancelled = true
    }
  }, [step, activeDay, advisor, locale])

  // With "best match", the advisor is whoever is free at the chosen time.
  const slotAdvisor = slots.find((s) => s.start === slot)?.advisor
  const chosen = agents.find((a) => a.slug === (advisor === "best" ? slotAdvisor : advisor)) ?? bestMatch

  const fmt = useMemo(() => {
    const tag = intlLocale(locale)
    return {
      dayName: new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }),
      dayNum: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }),
      time: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: timezone }),
      dubai: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: DUBAI_TZ }),
      long: new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", timeZone: timezone }),
    }
  }, [locale, timezone])

  const modes = MODES.filter((m) => m.key !== "onsite" || purpose === "viewing")
  const officeAddress = t("steps.mode.options.office.body")

  const submit = () => {
    if (!purpose || !mode || !slot) return
    startTransition(async () => {
      const res = await createBooking({
        purpose,
        mode,
        advisor,
        start: slot,
        timezone,
        name: details.name,
        email: details.email,
        phone: details.phone,
        language: details.language,
        notes: details.notes || undefined,
        property: initial.property?.slug,
        budget,
        timeline,
        consent: details.consent as true,
        turnstile: human,
      })
      if (res.status === "success") {
        setResult(res)
        fireConfetti()
      } else {
        setError(
          res.reason === "slotTaken"
            ? t("errors.slotTaken")
            : res.reason === "invalid"
              ? t("errors.invalid")
              : res.reason === "human"
                ? t("errors.human")
                : res.reason === "rateLimited"
                  ? t("errors.rateLimited")
                  : t("errors.generic"),
        )
        if (res.reason === "slotTaken") go("time", -1)
      }
    })
  }

  /* ── Confirmation ── */
  if (result && slot && purpose) {
    const start = new Date(slot)
    const event = {
      id: result.id,
      start,
      minutes: schedule.slotMinutes,
      title: t("eventTitle", { purpose: t(`steps.purpose.options.${purpose}.label`) }),
      description: t("eventBody", { advisor: result.advisor, reference: result.id }),
      location: mode === "office" ? officeAddress : t(`steps.mode.options.${mode ?? "video"}.label`),
    }
    const downloadIcs = () => {
      const url = URL.createObjectURL(icsFile(event))
      const a = document.createElement("a")
      a.href = url
      a.download = "buildcaps-appointment.ics"
      a.click()
      URL.revokeObjectURL(url)
    }
    return (
      <div className="rounded-[2rem] bg-white p-8 text-center ring-1 ring-neutral-200 md:p-14">
        <TrackOn when event="booking" params={{ purpose, mode }} />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
          <CalendarCheck className="h-8 w-8 text-rose-500" />
        </span>
        <h2 className="mt-6 text-4xl font-semibold text-neutral-900">{t("confirmed.title")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          {t("confirmed.body", { advisor: result.advisor, date: fmt.long.format(start), time: fmt.time.format(start), email: details.email })}
        </p>
        <p className="mt-2 text-sm text-neutral-500">{t("confirmed.reference", { id: result.id })}</p>
        {result.meetingUrl && (
          <a href={result.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block break-all text-sm font-semibold text-rose-700 underline">
            {result.meetingUrl}
          </a>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">
            {t("confirmed.addGoogle")}
          </a>
          <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300">
            {t("confirmed.addOutlook")}
          </a>
          <button type="button" onClick={downloadIcs} className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300">
            {t("confirmed.downloadIcs")}
          </button>
        </div>
        <p className="mt-10 text-sm text-neutral-500">{t("confirmed.manage")}</p>
        <TransitionLink href="/insights" className="mt-4 inline-block font-semibold text-rose-700 hover:underline">
          {t("confirmed.prepare")}
        </TransitionLink>
      </div>
    )
  }

  const canContinue: Record<Step, boolean> = {
    purpose: !!purpose,
    context: true,
    mode: !!mode,
    advisor: !!advisor,
    time: !!slot,
    details: details.name.trim().length > 1 && /.+@.+\..+/.test(details.email) && details.phone.trim().length >= 6 && details.consent,
  }

  // No bookable advisors yet (or all hidden): offer WhatsApp and phone instead of an empty calendar.
  if (!advisors.length) {
    return (
      <div className="max-w-2xl rounded-[2rem] bg-white p-8 ring-1 ring-neutral-200 md:p-12">
        <h2 className="text-2xl font-semibold text-neutral-900">{t("unavailable.title")}</h2>
        <p className="mt-3 text-neutral-600">{t("unavailable.body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white">
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
          <a href={site.phones[0].href} className="inline-flex items-center rounded-full px-6 py-3 font-semibold text-neutral-900 ring-1 ring-neutral-300">
            <bdi>{site.phones[0].display}</bdi>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-neutral-500">{t("progress", { current: index + 1, total: STEPS.length })}</p>
          <div className="flex flex-1 gap-1.5 sm:max-w-xs" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-rose-500" : "bg-neutral-200")} />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-neutral-200 md:p-10">
          <StepTransition stepKey={step} direction={direction}>
            {step === "purpose" && (
              <fieldset>
                <legend className="mb-6 text-2xl font-semibold text-neutral-900">{t("steps.purpose.title")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PURPOSES.map(({ key, icon }) => (
                    <Choice
                      key={key}
                      icon={icon}
                      selected={purpose === key}
                      onClick={() => {
                        setPurpose(key)
                        go("context")
                      }}
                      title={t(`steps.purpose.options.${key}.label`)}
                      body={t(`steps.purpose.options.${key}.body`)}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {step === "context" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-semibold text-neutral-900">{t("steps.context.title")}</h2>
                {initial.property && (
                  <div className="rounded-2xl bg-sand-100/70 p-4">
                    <p className="text-xs text-neutral-500">{t("steps.context.property")}</p>
                    <p className="mt-1 font-semibold text-neutral-900">{initial.property.title}</p>
                  </div>
                )}
                <div>
                  <p className="mb-3 text-sm font-medium text-neutral-700">
                    {t("steps.context.budget")} <span className="text-neutral-400">· {tc("optional")}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((b) => (
                      <Chip key={b} selected={budget === b} onClick={() => setBudget(budget === b ? undefined : b)}>
                        {t(`steps.context.budgets.${b}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium text-neutral-700">
                    {t("steps.context.timeline")} <span className="text-neutral-400">· {tc("optional")}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TIMELINES.map((tl) => (
                      <Chip key={tl} selected={timeline === tl} onClick={() => setTimeline(timeline === tl ? undefined : tl)}>
                        {t(`steps.context.timelines.${tl}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === "mode" && (
              <fieldset>
                <legend className="mb-6 text-2xl font-semibold text-neutral-900">{t("steps.mode.title")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {modes.map(({ key, icon }) => (
                    <Choice
                      key={key}
                      icon={icon}
                      selected={mode === key}
                      onClick={() => {
                        setMode(key)
                        go("advisor")
                      }}
                      title={t(`steps.mode.options.${key}.label`)}
                      body={t(`steps.mode.options.${key}.body`)}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {step === "advisor" && (
              <fieldset className="space-y-4">
                <legend className="mb-6 text-2xl font-semibold text-neutral-900">{t("steps.advisor.title")}</legend>
                <Choice
                  icon={Sparkles}
                  selected={advisor === "best"}
                  onClick={() => setAdvisor("best")}
                  title={t("steps.advisor.bestMatch")}
                  body={t("steps.advisor.bestMatchBody")}
                />
                <p className="pt-2 text-sm font-medium text-neutral-500">{t("steps.advisor.orChoose")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {advisors.map((a) => (
                    <Choice
                      key={a.slug}
                      icon={Languages}
                      selected={advisor === a.slug}
                      onClick={() => setAdvisor(a.slug)}
                      title={a.name}
                      body={`${tt(`roles.${a.role}`)} · ${a.languages.map((l) => localeNames[l]).join(", ")}`}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {step === "time" && (
              <div>
                <h2 className="mb-2 text-2xl font-semibold text-neutral-900">{t("steps.time.title")}</h2>
                <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                  <span>{t("steps.time.timezone", { timezone: timezone.replace(/_/g, " ") })}</span>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{t("steps.time.change")}</span>
                    <NativeSelect value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-9 w-auto text-xs">
                      {[...new Set([timezone, ...ZONES])].map((z) => (
                        <option key={z} value={z}>
                          {z.replace(/_/g, " ")}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                </div>

                <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2" data-lenis-prevent-horizontal role="listbox" aria-label={t("steps.time.title")}>
                  {days.map((d) => {
                    const date = new Date(`${d}T12:00:00Z`)
                    const selected = d === activeDay
                    return (
                      <button
                        key={d}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setDay(d)
                          setSlot(undefined)
                        }}
                        className={cn(
                          "flex w-20 shrink-0 flex-col items-center rounded-2xl border py-3",
                          selected ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700 hover:border-rose-300",
                        )}
                      >
                        <span className="text-xs">{fmt.dayName.format(date)}</span>
                        <span className="mt-1 text-sm font-semibold">{fmt.dayNum.format(date)}</span>
                      </button>
                    )
                  })}
                </div>

                {loadingSlots ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy>
                    {Array.from({ length: 8 }, (_, i) => (
                      <span key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-neutral-600">{t("steps.time.noSlots")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {slots.map(({ start }) => {
                      const iso = start
                      const s = new Date(start)
                      return (
                        <button
                          key={iso}
                          type="button"
                          aria-pressed={slot === iso}
                          onClick={() => setSlot(iso)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-center",
                            slot === iso ? "border-rose-500 bg-rose-500 text-white" : "border-neutral-200 text-neutral-900 hover:border-rose-300",
                          )}
                        >
                          <span className="block font-semibold">{fmt.time.format(s)}</span>
                          {timezone !== DUBAI_TZ && (
                            <span className={cn("mt-0.5 block text-xs", slot === iso ? "text-white/80" : "text-neutral-500")}>
                              {t("steps.time.dubaiTime", { time: fmt.dubai.format(s) })}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {step === "details" && (
              <div className="space-y-4">
                <h2 className="mb-2 text-2xl font-semibold text-neutral-900">{t("steps.details.title")}</h2>
                {(
                  [
                    { key: "name", type: "text", auto: "name" },
                    { key: "email", type: "email", auto: "email" },
                    { key: "phone", type: "tel", auto: "tel" },
                  ] as const
                ).map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t(`steps.details.${f.key}`)}</span>
                    <input
                      type={f.type}
                      autoComplete={f.auto}
                      dir={f.key === "phone" ? "ltr" : undefined}
                      value={details[f.key]}
                      onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 rtl:text-end"
                      required
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("steps.details.language")}</span>
                  <NativeSelect value={details.language} onChange={(e) => setDetails((d) => ({ ...d, language: e.target.value }))} className="h-12">
                    {locales.map((l) => (
                      <option key={l} value={l}>
                        {localeNames[l]}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                    {t("steps.details.notes")} <span className="text-neutral-400">· {tc("optional")}</span>
                  </span>
                  <textarea
                    rows={3}
                    value={details.notes}
                    onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </label>
                <label className="flex items-start gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={details.consent}
                    onChange={(e) => setDetails((d) => ({ ...d, consent: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-rose-500"
                  />
                  {t("steps.details.consent")}
                </label>
                <Turnstile onToken={setHuman} />
              </div>
            )}
          </StepTransition>

          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-700 disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {tc("back")}
            </button>
            {step === "details" ? (
              <button
                type="button"
                onClick={submit}
                disabled={!canContinue.details || pending}
                className="glow-rose inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3 font-semibold text-white disabled:opacity-40"
              >
                {pending ? tc("loading") : t("confirm")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(STEPS[index + 1])}
                disabled={!canContinue[step]}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
              >
                {tc("continue")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-4">
        <div className="space-y-4 rounded-[2rem] bg-sand-100/70 p-6 lg:sticky lg:top-28">
          <p className="text-label text-rose-700">{t("summary")}</p>
          <dl className="space-y-3 text-sm">
            {purpose && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("summaryLabels.purpose")}</dt>
                <dd className="text-end font-medium text-neutral-900">{t(`steps.purpose.options.${purpose}.label`)}</dd>
              </div>
            )}
            {mode && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("summaryLabels.mode")}</dt>
                <dd className="text-end font-medium text-neutral-900">{t(`steps.mode.options.${mode}.label`)}</dd>
              </div>
            )}
            {index >= STEPS.indexOf("advisor") && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("summaryLabels.advisor")}</dt>
                <dd className="text-end font-medium text-neutral-900">{chosen?.name ?? t("steps.advisor.bestMatch")}</dd>
              </div>
            )}
            {slot && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">{t("summaryLabels.time")}</dt>
                <dd className="text-end font-medium text-neutral-900">
                  {fmt.long.format(new Date(slot))}, {fmt.time.format(new Date(slot))}
                </dd>
              </div>
            )}
          </dl>
          <p className="flex items-center gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-600">
            <Check className="h-4 w-4 text-rose-500" />
            {t("trust")}
          </p>
        </div>
      </aside>
    </div>
  )
}
