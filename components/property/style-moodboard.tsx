"use client"

import { useState, useTransition } from "react"
import { Loader2, Palette, RotateCcw, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { moodboardAction } from "@/app/actions/listing-ai"
import { moodBudgets, moodStyles, type MoodBudget, type Moodboard, type MoodStyle } from "@/lib/insights/moodboard"
import { formatMoney } from "@/lib/format"
import { Choice } from "@/components/tools/ai/common"

/** Style Moodboard: a furnishing direction for this unit, with palette, room ideas and an indicative budget. */
export function StyleMoodboard({ slug }: { slug: string }) {
  const t = useTranslations("property.moodboard")
  const locale = useLocale() as Locale
  const [style, setStyle] = useState<MoodStyle>("modernArabic")
  const [budget, setBudget] = useState<MoodBudget>("comfort")
  const [purpose, setPurpose] = useState<"live" | "rent">("live")
  const [board, setBoard] = useState<Moodboard | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, start] = useTransition()

  const create = () =>
    start(async () => {
      const result = await moodboardAction({ slug, style, budget, purpose }, locale).catch(() => null)
      setBoard(result)
      setFailed(!result)
    })

  if (!board) {
    return (
      <div className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8">
        <p className="text-neutral-600">{t("intro")}</p>
        <Choice label={t("style")} options={moodStyles.map((s) => ({ value: s, label: t(`styles.${s}`) }))} value={style} onChange={setStyle} />
        <Choice label={t("budget")} options={moodBudgets.map((b) => ({ value: b, label: t(`budgets.${b}`) }))} value={budget} onChange={setBudget} />
        <Choice label={t("purpose")} options={[{ value: "live" as const, label: t("purposes.live") }, { value: "rent" as const, label: t("purposes.rent") }]} value={purpose} onChange={setPurpose} />
        <button type="button" disabled={pending} onClick={create} className="inline-flex h-12 items-center gap-2 rounded-xl bg-neutral-900 px-6 font-semibold text-white disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-rose-300" />}
          {pending ? t("creating") : t("create")}
        </button>
        {failed && <p className="text-sm text-neutral-500">{t("unavailable")}</p>}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200">
      {/* The palette as a band of colour */}
      <div className="flex h-28" aria-hidden>
        {board.palette.map((c) => (
          <span key={c.hex + c.name} className="flex-1" style={{ background: c.hex }} />
        ))}
      </div>
      <div className="space-y-8 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
              <Palette className="h-3.5 w-3.5" /> {t(`styles.${style}`)} · {t(`budgets.${budget}`)}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-neutral-900">{board.name}</h3>
          </div>
          <button type="button" onClick={() => setBoard(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
            <RotateCcw className="h-4 w-4" /> {t("again")}
          </button>
        </div>
        <p className="max-w-3xl text-lg leading-relaxed text-neutral-700">{board.story}</p>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {board.palette.map((c) => (
            <li key={c.hex + c.name} className="flex items-center gap-3">
              <span className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-black/10" style={{ background: c.hex }} />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-neutral-900">{c.name}</span>
                <span className="block text-xs text-neutral-500">{c.use}</span>
              </span>
            </li>
          ))}
        </ul>

        {board.materials.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">{t("materials")}</h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {board.materials.map((m) => (
                <li key={m} className="rounded-full bg-sand-100 px-3 py-1 text-sm text-neutral-700">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {board.rooms.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {board.rooms.map((r) => (
              <div key={r.room} className="rounded-2xl bg-sand-100/60 p-4">
                <p className="font-medium text-neutral-900">{r.room}</p>
                <p className="mt-1 text-sm text-neutral-700">{r.idea}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-neutral-900">{t("pieces")}</h4>
          <ul className="mt-3 divide-y divide-neutral-100">
            {board.pieces.map((p) => (
              <li key={p.item} className="flex items-start justify-between gap-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-neutral-900">{p.item}</span>
                  <span className="block text-neutral-500">{p.why}</span>
                </span>
                <bdi className="shrink-0 text-neutral-900">{formatMoney(p.priceAed, "AED", locale)}</bdi>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-neutral-200 pt-3 font-semibold text-neutral-900">
            <span>{t("total")}</span>
            <bdi>{formatMoney(board.totalAed, "AED", locale)}</bdi>
          </p>
        </div>

        {board.tips.length > 0 && (
          <ul className="space-y-2 text-sm text-neutral-700">
            {board.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                {tip}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-neutral-500">{t("disclaimer")}</p>
      </div>
    </div>
  )
}
