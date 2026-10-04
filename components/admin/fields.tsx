"use client"

import { useRef, useState, useTransition } from "react"
import { Languages, Loader2 } from "lucide-react"
import { translateText } from "@/app/[locale]/admin/actions"
import { localeNames, locales, isRtl } from "@/i18n/locales"
import { cn } from "@/lib/utils"

type Localized = Partial<Record<string, string>>

export function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-neutral-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      <FieldError error={error} />
    </label>
  )
}

/**
 * English is required and always visible; the other nine languages sit behind a
 * toggle. Empty languages fall back to English on the site (and get AI drafts in M8).
 */
export function LocalizedField({
  name,
  label,
  value,
  multiline,
  error,
  onEnglishChange,
}: {
  name: string
  label: string
  value?: Localized
  multiline?: boolean
  error?: string
  onEnglishChange?: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState<string>()
  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})
  const filled = locales.filter((l) => l !== "en" && value?.[l]).length
  const Input = multiline ? "textarea" : "input"

  // AI drafts for the languages that are still empty; filled ones are never overwritten.
  const translate = () =>
    startTransition(async () => {
      const missing = locales.filter((l) => l !== "en" && !refs.current[l]?.value.trim())
      const res = await translateText(refs.current.en?.value ?? "", missing)
      if (res.error) return setNote(res.error)
      for (const [l, text] of Object.entries(res.values)) if (refs.current[l] && text) refs.current[l]!.value = text
      setNote(res.warnings.length ? `Check: ${res.warnings.join("; ")}` : "Translations drafted. Native review is still needed for Arabic, Urdu and Farsi.")
    })

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-800">{label}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900">
          <Languages className="h-3.5 w-3.5" />
          {open ? "Hide translations" : `Translations (${filled}/9)`}
        </button>
      </div>
      <Input
        ref={(el: HTMLInputElement | HTMLTextAreaElement | null) => {
          refs.current.en = el
        }}
        name={`${name}.en`}
        defaultValue={value?.en}
        rows={multiline ? 4 : undefined}
        onChange={(e) => onEnglishChange?.(e.target.value)}
        className={cn("admin-input", multiline && "h-auto py-2.5")}
      />
      <FieldError error={error} />
      <div className={cn("mt-3 space-y-3 rounded-xl bg-neutral-50 p-3", !open && "hidden")}>
        {locales
          .filter((l) => l !== "en")
          .map((l) => (
            <label key={l} className="block">
              <span className="mb-1 block text-xs text-neutral-500">{localeNames[l]}</span>
              <Input
                ref={(el: HTMLInputElement | HTMLTextAreaElement | null) => {
                  refs.current[l] = el
                }}
                name={`${name}.${l}`}
                defaultValue={value?.[l]}
                dir={isRtl(l) ? "rtl" : "ltr"}
                lang={l}
                rows={multiline ? 3 : undefined}
                className={cn("admin-input", multiline && "h-auto py-2")}
              />
            </label>
          ))}
        <button type="button" onClick={translate} disabled={pending} className="flex items-center gap-1.5 text-xs font-medium text-rose-700 disabled:opacity-50">
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          Translate empty languages with AI
        </button>
        {note && <p className="text-xs text-neutral-600">{note}</p>}
      </div>
    </div>
  )
}

export function Checkboxes({ name, options, selected }: { name: string; options: { value: string; label: string }[]; selected?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name={name} value={o.value} defaultChecked={selected?.includes(o.value)} className="h-4 w-4 accent-rose-500" />
          {o.label}
        </label>
      ))}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <h2 className="mb-5 font-semibold text-neutral-900">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}
