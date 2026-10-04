"use client"

import { useState, useTransition } from "react"
import { AudioLines, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { listingIntroAction, type VoiceNote as Note } from "@/app/actions/listing-ai"
import { Speak } from "@/components/tools/ai/common"

/** Advisor Voice Note: the advisor's intro to this listing, in the visitor's language, read aloud by the browser. */
export function VoiceNote({ slug, advisor }: { slug: string; advisor: string }) {
  const t = useTranslations("property.voiceNote")
  const locale = useLocale()
  const [note, setNote] = useState<Note | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, start] = useTransition()
  const first = advisor.split(" ")[0]

  if (!note) {
    return (
      <div className="mt-5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await listingIntroAction(slug, locale).catch(() => null)
              setNote(result)
              setFailed(!result)
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-200 hover:ring-rose-300 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4 text-rose-500" />}
          {pending ? t("preparing") : t("cta", { name: first })}
        </button>
        {failed && <p className="mt-2 text-xs text-neutral-500">{t("unavailable")}</p>}
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
        <AudioLines className="h-3.5 w-3.5" /> {t("title", { name: first })}
      </p>
      <Speak text={note.script} tone="light" />
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-neutral-500">{t("transcript")}</summary>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{note.script}</p>
      </details>
      <p className="mt-3 text-[11px] text-neutral-400">{t("note")}</p>
    </div>
  )
}
