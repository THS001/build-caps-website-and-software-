"use client"

import { useState, useTransition, type FormEvent } from "react"
import { Loader2, Search, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { askBuildcaps } from "@/app/actions/ai"
import { useTransitionRouter } from "@/components/motion/view-transitions"
import { cn } from "@/lib/utils"

type AskSearchProps = {
  initialQuery?: string
  /** Hide the example chips (e.g. on the listings page). */
  compact?: boolean
  className?: string
}

/** "Ask Buildcaps": a plain-language search, in any of the 10 languages, that turns into listing filters. */
export function AskSearch({ initialQuery = "", compact, className }: AskSearchProps) {
  const t = useTranslations("home.search")
  const locale = useLocale()
  const router = useTransitionRouter()
  const [query, setQuery] = useState(initialQuery)
  const [pending, startTransition] = useTransition()
  const examples = t.raw("examples") as string[]

  const run = (text: string) =>
    startTransition(async () => {
      const params = text.trim() ? await askBuildcaps(text, locale) : ""
      router.push(`/properties${params ? `?${params}` : ""}`)
    })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    run(query)
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} role="search" className="border-gradient flex items-center gap-2 rounded-full bg-white p-2 shadow-[0_30px_80px_-40px_rgb(0_23_63/0.35)]">
        <Sparkles className="ms-3 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
        <label htmlFor="ask-buildcaps" className="sr-only">
          {t("title")}
        </label>
        <input
          id="ask-buildcaps"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        <button type="submit" className="flex shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="hidden sm:inline">{t("cta")}</span>
        </button>
      </form>
      {!compact && (
        <ul className={cn("mt-4 flex flex-wrap justify-center gap-2")}>
          {examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => {
                  setQuery(example)
                  run(example)
                }}
                className="rounded-full border border-neutral-200 bg-white/70 px-4 py-2 text-sm text-neutral-700 transition-colors hover:border-rose-300 hover:text-neutral-900"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
