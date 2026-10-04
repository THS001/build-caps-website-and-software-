"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteFunnel, deleteProperty, setPropertyPublished } from "@/app/[locale]/admin/actions"
import { unwrap } from "@/lib/action-result"

/** Publish/unpublish, view and delete buttons for an admin table row. */
export function RowActions({ kind, id, published, viewHref }: { kind: "property" | "funnel"; id: string; published?: boolean; viewHref?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await unwrap(action())
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })

  return (
    <div className={`flex items-center justify-end gap-3 text-xs ${pending ? "opacity-50" : ""}`}>
      {kind === "property" && (
        <button type="button" onClick={() => run(() => setPropertyPublished(id, !published))} className="font-medium text-neutral-700 hover:text-neutral-950">
          {published ? "Unpublish" : "Publish"}
        </button>
      )}
      {viewHref && (
        <a href={viewHref} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-700 hover:text-neutral-950">
          View
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          if (confirm("Delete permanently? This can’t be undone.")) run(() => (kind === "property" ? deleteProperty(id) : deleteFunnel(id)))
        }}
        className="font-medium text-red-600 hover:text-red-700"
      >
        Delete
      </button>
    </div>
  )
}
