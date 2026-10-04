"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { checkAllPublished, recheckItem, resolveFlag } from "@/app/[locale]/admin/qa-actions"
import { unwrap } from "@/lib/action-result"

function useRun() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await unwrap(fn())
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })
  return { pending, run }
}

export function ResolveFlag({ id }: { id: string }) {
  const { pending, run } = useRun()
  return (
    <button type="button" disabled={pending} onClick={() => run(() => resolveFlag(id))} className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50">
      Mark fixed
    </button>
  )
}

export function RecheckItem({ table, rowKey }: { table: string; rowKey: string }) {
  const { pending, run } = useRun()
  return (
    <button type="button" disabled={pending} onClick={() => run(() => recheckItem(table, rowKey))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check again
    </button>
  )
}

export function CheckAll() {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMessage(await unwrap(checkAllPublished()).catch((e) => (e instanceof Error ? e.message : "Something went wrong."))))}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Check all published content
      </button>
      {message && <p className="text-sm text-neutral-600">{message}</p>}
    </div>
  )
}
