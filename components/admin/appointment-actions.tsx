"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { reassignAppointment, setAppointmentStatus } from "@/app/[locale]/admin/actions"
import { unwrap } from "@/lib/action-result"

export function AppointmentActions({ id, status, agent, agents }: { id: string; status: string; agent: string; agents: { value: string; label: string }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const run = (action: () => Promise<unknown>, undo?: () => void) =>
    startTransition(async () => {
      try {
        await unwrap(action())
        router.refresh()
      } catch (e) {
        undo?.()
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${pending ? "opacity-50" : ""}`}>
      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{status}</span>
      <select
        aria-label="Advisor"
        defaultValue={agent}
        disabled={status !== "confirmed"}
        onChange={(e) => {
          const select = e.currentTarget
          run(() => reassignAppointment(id, select.value), () => (select.value = agent))
        }}
        className="admin-input h-9 w-auto"
      >
        {agents.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      {status === "confirmed" && (
        <>
          <button type="button" onClick={() => run(() => setAppointmentStatus(id, "completed"))} className="rounded-full px-3 py-1.5 ring-1 ring-neutral-200 hover:bg-neutral-50">
            Completed
          </button>
          <button type="button" onClick={() => run(() => setAppointmentStatus(id, "no_show"))} className="rounded-full px-3 py-1.5 ring-1 ring-neutral-200 hover:bg-neutral-50">
            No-show
          </button>
          <button
            type="button"
            onClick={() => confirm("Cancel this appointment and email the client?") && run(() => setAppointmentStatus(id, "cancelled"))}
            className="rounded-full px-3 py-1.5 text-red-700 ring-1 ring-red-200"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  )
}
