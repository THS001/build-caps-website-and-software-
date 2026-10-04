"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { staffCreateBooking, staffFreeSlots } from "@/app/[locale]/admin/crm-actions"
import { Field } from "@/components/admin/fields"
import { MODES, PURPOSES } from "@/lib/crm"
import { locales, localeNames } from "@/i18n/locales"
import { cn } from "@/lib/utils"
import { useFormAction } from "@/components/admin/use-form-action"
import { unwrap } from "@/lib/action-result"

type Prefill = { contactId?: string; name?: string; email?: string; phone?: string; language?: string; agent?: string; date?: string }

/** A booking taken by phone, WhatsApp or at the desk. Shows the advisor's free times; any time can still be typed. */
export function StaffBookingForm({ agents, slotMinutes, prefill }: { agents: { slug: string; name: string }[]; slotMinutes: number; prefill: Prefill }) {
  const { state, pending, form } = useFormAction(staffCreateBooking)
  const e = state.fieldErrors ?? {}
  const [agent, setAgent] = useState(prefill.agent ?? agents[0]?.slug ?? "")
  const [date, setDate] = useState(prefill.date ?? new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10))
  const [time, setTime] = useState("")
  const [free, setFree] = useState<string[] | null>(null)

  useEffect(() => {
    if (!agent || !date) return
    let cancelled = false
    setFree(null)
    unwrap(staffFreeSlots(agent, date))
      .then((list) => !cancelled && setFree(list))
      .catch(() => !cancelled && setFree([]))
    return () => {
      cancelled = true
    }
  }, [agent, date])

  if (!agents.length)
    return (
      <p className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">
        No one can take bookings yet. Add an active advisor in <Link href="/admin/team/new" className="underline">Team</Link> first (the CEO isn&apos;t bookable).
      </p>
    )

  return (
    <form {...form} className="grid gap-5 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 md:grid-cols-2">
      <input type="hidden" name="contact_id" value={prefill.contactId ?? ""} />
      <p className="font-semibold text-neutral-900 md:col-span-2">Client</p>
      <Field label="Full name" error={e.name}>
        <input name="name" required defaultValue={prefill.name} className="admin-input" />
      </Field>
      <Field label="Email" error={e.email}>
        <input name="email" type="email" required defaultValue={prefill.email} className="admin-input" />
      </Field>
      <Field label="Phone / WhatsApp" error={e.phone}>
        <input name="phone" required defaultValue={prefill.phone} className="admin-input" dir="ltr" />
      </Field>
      <Field label="Language">
        <select name="language" defaultValue={prefill.language ?? "en"} className="admin-input">
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </Field>

      <p className="mt-2 font-semibold text-neutral-900 md:col-span-2">Meeting</p>
      <Field label="Purpose">
        <select name="purpose" defaultValue="strategy" className="admin-input">
          {PURPOSES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="How">
        <select name="mode" defaultValue="office" className="admin-input">
          {MODES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Advisor" error={e.agent_slug}>
        <select name="agent_slug" value={agent} onChange={(ev) => setAgent(ev.target.value)} className="admin-input">
          {agents.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Length">
        <select name="minutes" defaultValue={slotMinutes} className="admin-input">
          {[...new Set([15, 30, 45, 60, 90, 120, 180, slotMinutes])].sort((a, b) => a - b).map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date" error={e.date}>
        <input name="date" type="date" required value={date} onChange={(ev) => setDate(ev.target.value)} className="admin-input" />
      </Field>
      <Field label="Time (Dubai)" error={e.time}>
        <input name="time" type="time" step={300} required value={time} onChange={(ev) => setTime(ev.target.value)} className="admin-input" />
      </Field>
      <div className="md:col-span-2">
        <p className="text-sm font-medium text-neutral-800">Free times for this advisor</p>
        {free === null ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : free.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {free.map((t) => (
              <button key={t} type="button" onClick={() => setTime(t)} className={cn("rounded-full px-3 py-1.5 text-sm ring-1", time === t ? "bg-neutral-900 text-white ring-neutral-900" : "ring-neutral-200 hover:ring-rose-300")}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No free slots in their working hours that day. You can still type a time and allow overlap.</p>
        )}
      </div>
      <Field label="Notes for the advisor" className="md:col-span-2">
        <textarea name="notes" rows={3} className="admin-input h-auto py-2" />
      </Field>
      <Field label="Property (optional, URL slug)">
        <input name="property_slug" className="admin-input" placeholder="e.g. 2-bed-marina-crest" />
      </Field>
      <div className="space-y-2 self-end text-sm text-neutral-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notify" defaultChecked /> Email the client a confirmation
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="force" /> Allow overlap with another booking
        </label>
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Book
        </button>
        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      </div>
    </form>
  )
}
