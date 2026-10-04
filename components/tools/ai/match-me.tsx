"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { matchAction } from "@/app/actions/intel"
import type { Match, MatchAnswers } from "@/lib/insights/match"
import { formatMoney, formatPercent } from "@/lib/format"
import { TransitionLink } from "@/components/motion/view-transitions"
import { EnquiryForm } from "@/components/site/enquiry-form"
import { cn } from "@/lib/utils"

const STEPS = ["goal", "budget", "type", "beds", "timing", "priorities"] as const
const BUDGETS = [1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000]
const PRIORITIES: Record<MatchAnswers["goal"], MatchAnswers["priorities"]> = {
  live: ["family", "waterfront", "goldenVisa", "paymentPlan"],
  invest: ["yield", "growth", "goldenVisa", "paymentPlan"],
  both: ["yield", "growth", "family", "waterfront", "goldenVisa", "paymentPlan"],
}

export function MatchMe() {
  const t = useTranslations("intel.matchMe")
  const locale = useLocale() as Locale
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<MatchAnswers>({ goal: "both", budget: 2_000_000, type: "any", beds: 1, timing: "any", priorities: [] })
  const [result, setResult] = useState<{ matches: Match[]; notes: Record<string, string> } | null>(null)
  const [pending, start] = useTransition()
  const set = <K extends keyof MatchAnswers>(key: K, value: MatchAnswers[K]) => setAnswers((a) => ({ ...a, [key]: value }))
  const name = STEPS[step]

  const finish = () => start(async () => setResult(await matchAction(answers, locale).catch(() => ({ matches: [], notes: {} }))))
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())

  const option = (selected: boolean, label: string, onClick: () => void, key: string) => (
    <button key={key} type="button" aria-pressed={selected} onClick={onClick} className={cn("flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-start transition-colors", selected ? "border-rose-500 bg-rose-50 text-rose-800" : "border-neutral-200 text-neutral-800 hover:border-rose-200")}>
      {label}
      {selected && <Check className="h-4 w-4 shrink-0" />}
    </button>
  )

  if (result) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-neutral-900">{result.matches.length ? t("resultsTitle", { count: result.matches.length }) : t("noMatches")}</h2>
          <button type="button" onClick={() => (setResult(null), setStep(0))} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
            <RotateCcw className="h-4 w-4" /> {t("restart")}
          </button>
        </div>
        {!result.matches.length && (
          <div className="mt-8 max-w-2xl rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8">
            <p className="mb-5 text-neutral-700">{t("sendBrief")}</p>
            {/* The brief goes to the CRM in English for the advisor. */}
            <EnquiryForm
              source="tool:match-me"
              defaultMessage={`Match Me brief: ${answers.goal}, budget AED ${answers.budget.toLocaleString("en")}, ${answers.type}, ${answers.beds}+ beds, ${answers.timing}${answers.priorities.length ? `, priorities: ${answers.priorities.join(", ")}` : ""}`}
            />
          </div>
        )}
        <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {result.matches.map((m, i) => (
            <li key={m.property.slug} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-neutral-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{t("rank", { rank: i + 1 })}</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-900">{m.property.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">
                <bdi>{m.property.priceAed ? formatMoney(m.property.priceAed, "AED", locale) : "—"}</bdi>
                {" · "}
                {m.property.beds === 0 ? t("studio") : t("bedsShort", { count: m.property.beds })}
                {m.property.estYield ? ` · ${t("yieldShort", { value: formatPercent(m.property.estYield, locale) })}` : ""}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {m.reasons.map((r) => (
                  <li key={r} className="rounded-full bg-sand-100 px-2.5 py-1 text-xs text-neutral-700">
                    {t(`reasons.${r}`)}
                  </li>
                ))}
              </ul>
              {result.notes[m.property.slug] && (
                <p className="mt-4 flex gap-2 text-sm text-neutral-700">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  {result.notes[m.property.slug]}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-3 pt-6 text-sm font-semibold">
                <TransitionLink href={`/properties/${m.property.slug}`} className="rounded-full bg-neutral-900 px-4 py-2 text-white">
                  {t("view")}
                </TransitionLink>
                <TransitionLink href={`/book?purpose=viewing&property=${m.property.slug}`} className="rounded-full px-4 py-2 text-neutral-800 ring-1 ring-neutral-200">
                  {t("book")}
                </TransitionLink>
              </div>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-10">
      <div className="flex items-center gap-3 text-sm text-neutral-500" aria-hidden>
        <span>{t("progress", { step: step + 1, total: STEPS.length })}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <span className="block h-full rounded-full bg-rose-400 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </span>
      </div>
      <fieldset className="mt-8">
        <legend className="text-2xl font-semibold text-neutral-900">{t(`questions.${name}`)}</legend>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {name === "goal" && (["live", "invest", "both"] as const).map((g) => option(answers.goal === g, t(`goals.${g}`), () => set("goal", g), g))}
          {name === "budget" && BUDGETS.map((b) => option(answers.budget === b, t("upTo", { amount: formatMoney(b, "AED", locale) }), () => set("budget", b), String(b)))}
          {name === "type" && (["apartment", "villa", "any"] as const).map((v) => option(answers.type === v, t(`types.${v}`), () => set("type", v), v))}
          {name === "beds" && [0, 1, 2, 3, 4, 5].map((b) => option(answers.beds === b, b === 0 ? t("studio") : t("bedsAtLeast", { count: b }), () => set("beds", b), String(b)))}
          {name === "timing" && (["ready", "offPlan", "any"] as const).map((v) => option(answers.timing === v, t(`timing.${v}`), () => set("timing", v), v))}
          {name === "priorities" &&
            PRIORITIES[answers.goal].map((p) =>
              option(answers.priorities.includes(p), t(`priorities.${p}`), () => set("priorities", answers.priorities.includes(p) ? answers.priorities.filter((x) => x !== p) : [...answers.priorities, p]), p),
            )}
        </div>
        {name === "priorities" && <p className="mt-3 text-sm text-neutral-500">{t("prioritiesHint")}</p>}
      </fieldset>
      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 disabled:invisible">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </button>
        <button type="button" onClick={next} disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {step === STEPS.length - 1 ? t("show") : t("next")}
          {step < STEPS.length - 1 && <ArrowRight className="h-4 w-4 rtl:rotate-180" />}
        </button>
      </div>
    </div>
  )
}
