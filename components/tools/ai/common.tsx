"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import { Loader2, Sparkles, Square, Volume2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { localeTags, type Locale } from "@/i18n/locales"
import { explainInsight } from "@/app/actions/intel"
import { NativeSelect } from "@/components/site/native-select"
import { cn } from "@/lib/utils"

// Shared pieces for the Buildcaps Intelligence tools.

/** "Explain in plain words": Claude explains the figures on screen in the visitor's language. */
export function Explain({ kind, facts, tone = "dark" }: { kind: string; facts: unknown; tone?: "dark" | "light" }) {
  const t = useTranslations("intel.common")
  const locale = useLocale()
  const [text, setText] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")
  const key = JSON.stringify(facts)

  useEffect(() => {
    setText(null)
    setState("idle")
  }, [key])

  const run = async () => {
    setState("loading")
    const result = await explainInsight(kind, JSON.parse(key), locale).catch(() => null)
    setText(result)
    setState(result ? "idle" : "error")
  }

  return (
    <div className="mt-6">
      {!text && (
        <button
          type="button"
          onClick={run}
          disabled={state === "loading"}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors disabled:opacity-60",
            tone === "dark" ? "text-white ring-white/25 hover:bg-white/10" : "text-neutral-900 ring-neutral-200 hover:bg-neutral-50",
          )}
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-rose-400" />}
          {state === "loading" ? t("explaining") : t("explain")}
        </button>
      )}
      {state === "error" && <p className={cn("mt-2 text-sm", tone === "dark" ? "text-white/60" : "text-neutral-500")}>{t("explainUnavailable")}</p>}
      {text && (
        <div className={cn("rounded-2xl p-5", tone === "dark" ? "bg-white/[0.06]" : "bg-sand-100")}>
          <p className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", tone === "dark" ? "text-rose-300" : "text-rose-700")}>
            <Sparkles className="h-3.5 w-3.5" /> {t("inPlainWords")}
          </p>
          <p className={cn("mt-2 whitespace-pre-line leading-relaxed", tone === "dark" ? "text-white/85" : "text-neutral-700")}>{text}</p>
          <Speak text={text} tone={tone} />
        </div>
      )}
    </div>
  )
}

/** Reads text aloud with the browser's own voice (Web Speech API, free). */
export function Speak({ text, tone = "dark" }: { text: string; tone?: "dark" | "light" }) {
  const t = useTranslations("intel.common")
  const locale = useLocale() as Locale
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window)
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
    }
  }, [])
  if (!supported) return null

  const toggle = () => {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = localeTags[locale]
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    setSpeaking(true)
  }

  return (
    <button type="button" onClick={toggle} className={cn("mt-3 inline-flex items-center gap-2 text-sm font-medium", tone === "dark" ? "text-white/80 hover:text-white" : "text-neutral-700 hover:text-neutral-900")}>
      {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {speaking ? t("stop") : t("listen")}
    </button>
  )
}

export function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-12">
        {children}
      </NativeSelect>
    </div>
  )
}

/** Pill buttons for one choice (or several with `multiple`). */
export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T | T[]; onChange: (v: T) => void }) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-neutral-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected(o.value)}
            onClick={() => onChange(o.value)}
            className={cn("rounded-full border px-4 py-2 text-sm transition-colors", selected(o.value) ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700 hover:border-rose-200")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** A figure on the navy results panel. */
export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div>
      <p className="text-sm text-white/60">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold md:text-4xl", accent && "text-rose-metal")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  )
}

/** Inputs on white, results on navy: the same rhythm as the calculators. */
export function ToolLayout({ inputs, results, note }: { inputs: ReactNode; results: ReactNode; note?: ReactNode }) {
  const t = useTranslations("calc.common")
  const ta = useTranslations("ai")
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-2">{inputs}</div>
      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white md:p-8 lg:col-span-3" aria-live="polite">
        <p className="text-label mb-6 text-rose-300">{t("results")}</p>
        {results}
        <p className="mt-8 text-xs text-white/50">{note ?? ta("disclaimer")}</p>
      </div>
    </div>
  )
}

/** Explains where the figures come from: DLD sales, or illustrative samples until DLD data is loaded. */
export function BasisNote({ basis, className }: { basis: "dld" | "sample"; className?: string }) {
  const t = useTranslations("intel.common")
  return <p className={cn("text-xs text-neutral-500", className)}>{basis === "dld" ? t("basisDld") : t("basisSample")}</p>
}
