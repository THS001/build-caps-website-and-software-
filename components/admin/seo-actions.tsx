"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { approveSeoProposal, rejectSeoProposal, rollbackSeoProposal, runSeoNow } from "@/app/[locale]/admin/actions"
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

export function ProposalButtons({ id, status }: { id: string; status: string }) {
  const { pending, run } = useRun()
  if (status === "proposed")
    return (
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => approveSeoProposal(id))} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Approve and publish
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => rejectSeoProposal(id))} className="rounded-full px-4 py-2 text-sm text-neutral-600 ring-1 ring-neutral-200">
          Reject
        </button>
      </div>
    )
  if (status === "applied")
    return (
      <button type="button" disabled={pending} onClick={() => run(() => rollbackSeoProposal(id))} className="rounded-full px-4 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-60">
        Roll back
      </button>
    )
  return null
}

export function RunSeoButtons({ live }: { live: boolean }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const go = (mode: "dry_run" | "live") =>
    start(async () => {
      try {
        setMessage(await unwrap(runSeoNow(mode)))
        router.refresh()
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong.")
      }
    })
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => go("dry_run")} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Run now (dry run)
        </button>
        {live && (
          <button type="button" disabled={pending} onClick={() => go("live")} className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-200 disabled:opacity-60">
            Run now (live)
          </button>
        )}
      </div>
      {pending && <p className="mt-2 text-sm text-neutral-500">Researching and analysing. This can take a few minutes.</p>}
      {message && <p className="mt-2 text-sm text-neutral-700">{message}</p>}
    </div>
  )
}
