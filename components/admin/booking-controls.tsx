"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { staffRescheduleBooking } from "@/app/[locale]/admin/crm-actions"
import { unwrap } from "@/lib/action-result"

/** Move a booking (date, time, length, advisor) from the calendar. */
export function RescheduleForm({ id, date, time, minutes, agent, agents }: { id: string; date: string; time: string; minutes: number; agent: string; agents: { slug: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ date, time, minutes, agent, force: false, notify: true })
  const [message, setMessage] = useState<string | null>(null)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setMessage(null)
        start(async () => {
          try {
            await unwrap(staffRescheduleBooking({ id, ...form }))
            setMessage("Moved.")
            router.push(`/admin/calendar?week=${form.date}&open=${id}`)
            router.refresh()
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Couldn't move it.")
          }
        })
      }}
      className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-3 text-sm"
    >
      <p className="col-span-2 font-medium text-neutral-800">Reschedule or reassign</p>
      <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="admin-input h-9" aria-label="Date" />
      <input type="time" step={300} value={form.time} onChange={(e) => set("time", e.target.value)} className="admin-input h-9" aria-label="Time (Dubai)" />
      <select value={form.minutes} onChange={(e) => set("minutes", Number(e.target.value))} className="admin-input h-9" aria-label="Length">
        {[15, 30, 45, 60, 90, 120, 180].map((m) => (
          <option key={m} value={m}>
            {m} min
          </option>
        ))}
      </select>
      <select value={form.agent} onChange={(e) => set("agent", e.target.value)} className="admin-input h-9" aria-label="Advisor">
        {agents.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.name}
          </option>
        ))}
      </select>
      <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-600">
        <input type="checkbox" checked={form.notify} onChange={(e) => set("notify", e.target.checked)} /> Email the client the new time
      </label>
      <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-600">
        <input type="checkbox" checked={form.force} onChange={(e) => set("force", e.target.checked)} /> Allow overlap with another booking
      </label>
      <button disabled={pending} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
      {message && <p className={`col-span-2 text-xs ${message === "Moved." ? "text-emerald-700" : "text-red-600"}`}>{message}</p>}
    </form>
  )
}
