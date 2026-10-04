"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { discardFollowup, sendFollowup } from "@/app/[locale]/admin/actions"
import { unwrap } from "@/lib/action-result"

/** Lead Nurture draft: the advisor edits, then sends (or discards). Nothing is sent automatically. */
export function FollowupDraft({ id, score, reasoning, subject, body }: { id: string; score: number | null; reasoning: string | null; subject: string; body: string }) {
  const router = useRouter()
  const [s, setS] = useState(subject)
  const [b, setB] = useState(body)
  const [pending, startTransition] = useTransition()
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await unwrap(fn())
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })

  return (
    <div className="mt-4 rounded-xl bg-rose-50/50 p-4 ring-1 ring-rose-100">
      <p className="flex items-center gap-2 text-xs font-medium text-rose-700">
        <Sparkles className="h-3.5 w-3.5" /> AI follow-up draft{score !== null && ` · lead score ${score}/100`}
        {reasoning && <span className="font-normal text-neutral-500"> · {reasoning}</span>}
      </p>
      <input value={s} onChange={(e) => setS(e.target.value)} aria-label="Subject" className="admin-input mt-3" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} rows={6} aria-label="Message" className="admin-input mt-2 h-auto py-2" />
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => sendFollowup(id, s, b))} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Send email
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => discardFollowup(id))} className="rounded-full px-4 py-2 text-sm text-neutral-600 ring-1 ring-neutral-200">
          Discard
        </button>
      </div>
    </div>
  )
}
