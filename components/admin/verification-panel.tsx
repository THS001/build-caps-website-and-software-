"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, Loader2, ScanSearch } from "lucide-react"
import { confirmVerified, runPhotoCheck } from "@/app/[locale]/admin/actions"
import { unwrap } from "@/lib/action-result"

type Verification = { verdict: string; issues: string[]; checked_at: string; photo_count: number } | null

export function VerificationPanel({ id, verification, verifiedAt }: { id: string; verification: Verification; verifiedAt: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>()
  const color = verification?.verdict === "pass" ? "text-emerald-700" : verification?.verdict === "fail" ? "text-red-700" : "text-amber-700"

  return (
    <section className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
            <ScanSearch className="h-5 w-5 text-rose-500" /> Verified Listing
          </h2>
          {verification ? (
            <p className="mt-1 text-sm text-neutral-600">
              AI check {new Date(verification.checked_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })} ({verification.photo_count} photos):{" "}
              <strong className={color}>{verification.verdict}</strong>
              {verification.issues.length > 0 && ` · ${verification.issues.join("; ")}`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">Not checked yet. Save photos first.</p>
          )}
          {verifiedAt && (
            <p className="mt-1 flex items-center gap-1 text-sm text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Verified badge live since {new Date(verifiedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai" })}
            </p>
          )}
          {message && <p className="mt-2 text-sm text-neutral-700">{message}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const res = await unwrap(runPhotoCheck(id))
                  setMessage(res.message)
                  router.refresh()
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Check failed.")
                }
              })
            }
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-neutral-300"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Run AI photo check
          </button>
          {verification && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await unwrap(confirmVerified(id, !verifiedAt))
                    router.refresh()
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Couldn't change the badge.")
                  }
                })
              }
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {verifiedAt ? "Remove badge" : "Confirm as verified"}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
