"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { deleteReview, recomputeAdvisorScore, setReviewPublished } from "@/app/[locale]/admin/crm-actions"
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

export function RecomputeScore({ slug }: { slug: string }) {
  const { pending, run } = useRun()
  return (
    <button type="button" disabled={pending} onClick={() => run(() => recomputeAdvisorScore(slug))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Recalculate now
    </button>
  )
}

export function ReviewActions({ id, published }: { id: string; published: boolean }) {
  const { pending, run } = useRun()
  return (
    <span className={`inline-flex gap-3 text-xs ${pending ? "opacity-50" : ""}`}>
      <button type="button" disabled={pending} onClick={() => run(() => setReviewPublished(id, !published))} className={published ? "text-neutral-700 hover:underline" : "font-semibold text-emerald-700 hover:underline"}>
        {published ? "Hide" : "Approve and show"}
      </button>
      <button type="button" disabled={pending} onClick={() => confirm("Delete this review for good?") && run(() => deleteReview(id))} className="text-red-700 hover:underline">
        Delete
      </button>
    </span>
  )
}
