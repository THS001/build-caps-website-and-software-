"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { importDldCsv, runMarketIntelNow, saveCommunityMarket, type FormState } from "@/app/[locale]/admin/actions"
import { uploadForImport } from "@/components/admin/private-upload"
import { unwrap } from "@/lib/action-result"

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.")

export function MarketTools() {
  const router = useRouter()
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [pending, startImport] = useTransition()
  const [running, startRun] = useTransition()
  const [report, setReport] = useState<string>()

  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const file = new FormData(form).get("csv")
    if (!(file instanceof File) || !file.size) return setState({ status: "error", message: "Choose the DLD transactions CSV." })
    setState({ status: "idle" })
    startImport(async () => {
      try {
        const result = await importDldCsv(await uploadForImport(file, "dld"))
        setState(result)
        if (result.status === "done") {
          form.reset()
          router.refresh()
        }
      } catch (e) {
        setState({ status: "error", message: message(e) })
      }
    })
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <form onSubmit={upload} className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
        <p className="font-semibold text-neutral-900">Upload DLD transactions (CSV)</p>
        <p className="mt-1 text-sm text-neutral-500">Dubai Pulse “DLD Transactions” export. Sales from the last 24 months are kept; duplicates are skipped. Up to 50 MB per file: export a date range if the full file is bigger.</p>
        <input name="csv" type="file" accept=".csv,text/csv" required className="mt-4 block text-sm" />
        <button type="submit" disabled={pending} className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Import
        </button>
        {state.message && <p className={`mt-3 text-sm ${state.status === "done" ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      </form>
      <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
        <p className="font-semibold text-neutral-900">Market Intel agent</p>
        <p className="mt-1 text-sm text-neutral-500">Refreshes community figures from the stored data and drafts this week’s market note (saved unpublished in Insights).</p>
        <button
          type="button"
          disabled={running}
          onClick={() =>
            startRun(async () => {
              try {
                setReport(await unwrap(runMarketIntelNow()))
                router.refresh()
              } catch (e) {
                setReport(message(e))
              }
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold ring-1 ring-neutral-300 disabled:opacity-60"
        >
          {running && <Loader2 className="h-4 w-4 animate-spin" />} Run now
        </button>
        {report && <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">{report}</pre>}
      </div>
    </div>
  )
}

export function CommunityMarketRow({ slug, name, dldAreas, estYieldPct, stats }: { slug: string; name: string; dldAreas: string; estYieldPct: number | null; stats: string }) {
  const router = useRouter()
  const [areas, setAreas] = useState(dldAreas)
  const [yieldPct, setYieldPct] = useState(estYieldPct?.toString() ?? "")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const dirty = areas !== dldAreas || yieldPct !== (estYieldPct?.toString() ?? "")

  return (
    <div className="grid items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200 md:grid-cols-[1fr_2fr_120px_auto]">
      <div>
        <p className="font-medium text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">{stats}</p>
      </div>
      <input value={areas} onChange={(e) => setAreas(e.target.value)} aria-label={`DLD areas for ${name}`} className="admin-input" />
      <input value={yieldPct} onChange={(e) => setYieldPct(e.target.value)} type="number" step="0.1" aria-label={`Yield % for ${name}`} placeholder="Yield %" className="admin-input" />
      <button
        type="button"
        disabled={!dirty || pending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined)
            try {
              await unwrap(saveCommunityMarket(slug, areas, yieldPct))
              router.refresh()
            } catch (e) {
              setError(message(e))
            }
          })
        }
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
      >
        Save
      </button>
      {error && <p className="text-sm text-red-600 md:col-span-4">{error}</p>}
    </div>
  )
}
