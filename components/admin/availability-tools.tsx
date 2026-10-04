"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { addTimeOff, deleteTimeOff, regenerateFeed, saveBookingSettings, saveHours } from "@/app/[locale]/admin/crm-actions"
import type { FormState } from "@/app/[locale]/admin/actions"
import { Field } from "@/components/admin/fields"
import { errorText, useFormAction } from "@/components/admin/use-form-action"
import { unwrap } from "@/lib/action-result"

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function Saved({ state }: { state: FormState }) {
  if (!state.message) return null
  return <p className={`text-sm ${state.status === "done" ? "text-emerald-700" : "text-red-600"}`}>{errorText(state)}</p>
}

export function BookingRulesForm({ settings }: { settings: { slot_minutes: number; buffer_minutes: number; min_notice_hours: number; days_ahead: number } }) {
  const { state, pending, form } = useFormAction(saveBookingSettings)
  return (
    <form {...form} className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Meeting length (minutes)" hint="Length of each online booking slot">
        <input name="slot_minutes" type="number" min={15} max={240} step={5} defaultValue={settings.slot_minutes} className="admin-input" />
      </Field>
      <Field label="Buffer between meetings (minutes)" hint="Kept free before and after each booking">
        <input name="buffer_minutes" type="number" min={0} max={120} step={5} defaultValue={settings.buffer_minutes} className="admin-input" />
      </Field>
      <Field label="Minimum notice (hours)" hint="How soon a visitor can book">
        <input name="min_notice_hours" type="number" min={0} max={168} defaultValue={settings.min_notice_hours} className="admin-input" />
      </Field>
      <Field label="Bookable days shown" hint="Open days visitors can choose from">
        <input name="days_ahead" type="number" min={1} max={90} defaultValue={settings.days_ahead} className="admin-input" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save booking rules
        </button>
        <Saved state={state} />
      </div>
    </form>
  )
}

type Hours = { weekday: number; starts: string; ends: string }

/** One advisor's week. Unticked days take no bookings. No rows at all = the default Monday to Saturday, 09:00 to 19:00. */
export function HoursEditor({ agent, name, hours }: { agent: string; name: string; hours: Hours[] }) {
  const router = useRouter()
  const usesDefault = hours.length === 0
  const initial = Object.fromEntries(
    WEEKDAYS.map((d) => {
      const h = hours.find((x) => x.weekday === d)
      return [d, h ? { on: true, starts: h.starts, ends: h.ends } : { on: usesDefault && d !== 0, starts: "09:00", ends: "19:00" }]
    }),
  ) as Record<number, { on: boolean; starts: string; ends: string }>
  const [week, setWeek] = useState(initial)
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const set = (d: number, patch: Partial<(typeof week)[number]>) => setWeek((w) => ({ ...w, [d]: { ...w[d], ...patch } }))

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-neutral-900">{name}</h3>
        {usesDefault && <span className="text-xs text-neutral-500">Default hours</span>}
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {WEEKDAYS.map((d) => (
          <li key={d} className="grid grid-cols-[110px_1fr] items-center gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={week[d].on} onChange={(e) => set(d, { on: e.target.checked })} /> {DAY_NAMES[d].slice(0, 3)}
            </label>
            <span className={`flex items-center gap-2 ${week[d].on ? "" : "opacity-40"}`}>
              <input type="time" step={900} value={week[d].starts} disabled={!week[d].on} onChange={(e) => set(d, { starts: e.target.value })} className="admin-input h-9" aria-label={`${DAY_NAMES[d]} start`} />
              –
              <input type="time" step={900} value={week[d].ends} disabled={!week[d].on} onChange={(e) => set(d, { ends: e.target.value })} className="admin-input h-9" aria-label={`${DAY_NAMES[d]} end`} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMessage(null)
              try {
                await unwrap(
                  saveHours(
                    agent,
                    WEEKDAYS.filter((d) => week[d].on).map((d) => ({ weekday: d, starts: week[d].starts, ends: week[d].ends })),
                  ),
                )
                setMessage("Saved.")
                router.refresh()
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Couldn't save.")
              }
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save hours
        </button>
        {message && <span className={`text-sm ${message === "Saved." ? "text-emerald-700" : "text-red-600"}`}>{message}</span>}
      </div>
    </section>
  )
}

export function TimeOffForm({ agents }: { agents: { slug: string; name: string }[] }) {
  const { state, pending, form } = useFormAction(addTimeOff, { resetOnDone: true })
  const today = new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10)
  return (
    <form {...form} className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-neutral-200 sm:grid-cols-2 lg:grid-cols-6">
      <Field label="Who" className="lg:col-span-2">
        <select name="agent_slug" defaultValue="" className="admin-input">
          <option value="">Whole office (holiday)</option>
          {agents.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="From">
        <input name="from_date" type="date" required defaultValue={today} className="admin-input" />
      </Field>
      <Field label="To (inclusive)">
        <input name="to_date" type="date" required defaultValue={today} className="admin-input" />
      </Field>
      <Field label="From time" hint="Empty = whole day">
        <input name="from_time" type="time" step={900} className="admin-input" />
      </Field>
      <Field label="To time">
        <input name="to_time" type="time" step={900} className="admin-input" />
      </Field>
      <Field label="Reason (optional)" className="sm:col-span-2 lg:col-span-4">
        <input name="reason" className="admin-input" placeholder="Eid al-Fitr, annual leave, site visit…" />
      </Field>
      <div className="flex items-end gap-3 lg:col-span-2">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add time off
        </button>
        <Saved state={state} />
      </div>
    </form>
  )
}

export function DeleteTimeOff({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label="Remove" onClick={() =>
        start(async () => {
          try {
            await unwrap(deleteTimeOff(id))
            router.refresh()
          } catch (e) {
            alert(e instanceof Error ? e.message : "Something went wrong.")
          }
        })
      } className="text-neutral-400 hover:text-red-600">
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export function FeedLink({ label, url, agent }: { label: string; url: string | null; agent: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm">
      <span className="w-48 font-medium text-neutral-900">{label}</span>
      {url ? <code className="min-w-0 flex-1 truncate rounded bg-neutral-50 px-2 py-1 text-xs text-neutral-600">{url}</code> : <span className="flex-1 text-neutral-400">No link yet</span>}
      {url && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 ring-1 ring-neutral-200"
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          (!url || confirm("Create a new link? The old one stops working.")) &&
          start(async () => {
            try {
              await unwrap(regenerateFeed(agent))
              router.refresh()
            } catch (e) {
              alert(e instanceof Error ? e.message : "Something went wrong.")
            }
          })
        }
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 ring-1 ring-neutral-200 disabled:opacity-60"
      >
        <RefreshCw className="h-3.5 w-3.5" /> {url ? "New link" : "Create link"}
      </button>
    </li>
  )
}
