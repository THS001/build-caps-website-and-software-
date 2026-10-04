"use client"

import { useActionState } from "react"
import { AlertTriangle, FileUp, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { analyseDocumentAction, type DocumentState } from "@/app/actions/intel"
import { Turnstile } from "@/components/site/turnstile"
import { cn } from "@/lib/utils"

const riskTone = { high: "bg-red-50 text-red-700 ring-red-100", medium: "bg-amber-50 text-amber-800 ring-amber-100", low: "bg-neutral-50 text-neutral-700 ring-neutral-200" } as const

/** Promise Ledger: upload a brochure or SPA; Claude lists the promises and flags unusual clauses. Nothing is stored. */
export function DocumentCheck() {
  const t = useTranslations("intel.promiseLedger.check")
  const locale = useLocale()
  const [state, action, pending] = useActionState<DocumentState, FormData>(analyseDocumentAction, { status: "idle" })
  const r = state.result

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <form action={action} className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-2">
        <h2 className="text-xl font-semibold text-neutral-900">{t("title")}</h2>
        <p className="text-sm text-neutral-600">{t("body")}</p>
        <input type="hidden" name="locale" value={locale} />
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-600 hover:border-rose-300">
          <FileUp className="h-6 w-6 text-rose-500" />
          {t("pick")}
          <input type="file" name="file" accept="application/pdf" required className="w-full max-w-xs text-xs file:me-3 file:rounded-full file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-white" />
        </label>
        <Turnstile />
        <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("reading") : t("cta")}
        </button>
        {state.status === "error" && <p className="text-sm text-red-600">{t(`errors.${state.reason ?? "busy"}`)}</p>}
        <p className="text-xs text-neutral-500">{t("privacy")}</p>
      </form>

      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white md:p-8 lg:col-span-3" aria-live="polite">
        {!r ? (
          <p className="text-white/70">{t("empty")}</p>
        ) : (
          <div className="space-y-8">
            <section>
              <h3 className="text-label text-rose-300">{t("summary")}</h3>
              <p className="mt-3 leading-relaxed text-white/85">{r.summary}</p>
            </section>
            {r.clauses.length > 0 && (
              <section>
                <h3 className="text-label text-rose-300">{t("clauses")}</h3>
                <ul className="mt-3 space-y-3">
                  {r.clauses.map((c, i) => (
                    <li key={i} className="rounded-2xl bg-white p-4 text-neutral-800">
                      <p className="flex items-start justify-between gap-3">
                        <span className="font-semibold">{c.clause}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs ring-1", riskTone[c.risk])}>
                          <AlertTriangle className="me-1 inline h-3 w-3" />
                          {t(`risk.${c.risk}`)}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-neutral-600">{c.why}</p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">{t("ask")}</span> {c.ask}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {r.promises.length > 0 && (
              <section>
                <h3 className="text-label text-rose-300">{t("promises")}</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {r.promises.map((p, i) => (
                    <li key={i} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <span className="text-white/85">{p.text}</span>
                      <span className="shrink-0 text-white/50">{p.due ?? t(`categories.${p.category}`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {r.questions.length > 0 && (
              <section>
                <h3 className="text-label text-rose-300">{t("questions")}</h3>
                <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-white/85">
                  {r.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </section>
            )}
            <p className="text-xs text-white/50">{t("notLegal")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
