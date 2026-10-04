"use client"

import { useId, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

// Shared building blocks for the calculators and the AI tools: an inputs card on
// white and a navy results panel, so every tool reads the same way.

export function Layout({ inputs, results }: { inputs: ReactNode; results: ReactNode }) {
  const t = useTranslations("calc.common")
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-2">{inputs}</div>
      <div className="rounded-3xl bg-navy-900 p-6 text-white md:p-8 lg:col-span-3" aria-live="polite">
        <p className="text-label mb-6 text-rose-300">{t("results")}</p>
        {results}
        <p className="mt-8 text-xs text-white/50">{t("estimate")}</p>
      </div>
    </div>
  )
}

export function NumberField({ label, value, onChange, step = 1, min = 0, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          dir="ltr"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 rtl:text-end"
        />
        {suffix && <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{suffix}</span>}
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
      <span className="text-sm text-neutral-800">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-rose-500" />
    </label>
  )
}

export function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-sm text-white/60">{label}</p>
      <p className={cn("mt-1 text-4xl font-bold md:text-5xl", accent && "text-rose-metal")}>{value}</p>
    </div>
  )
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3 last:border-0">
      <span className="text-white/70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
