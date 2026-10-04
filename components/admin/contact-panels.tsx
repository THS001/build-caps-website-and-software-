"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Mail, MessageCircle, NotebookPen, Phone, Trash2, X } from "lucide-react"
import { addTask, completeTask, deleteActivity, deleteContact, deleteTask, logActivity, updateContact } from "@/app/[locale]/admin/crm-actions"
import { STAGES, relative } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { unwrap } from "@/lib/action-result"

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<unknown>, after?: () => void, undo?: () => void) =>
    start(async () => {
      try {
        await unwrap(fn())
        after?.()
        router.refresh()
      } catch (e) {
        undo?.()
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })
  return { pending, run }
}

const DUBAI_OFFSET_MS = 4 * 3600_000 // Dubai is UTC+4 all year

export type ContactView = {
  id: string
  name: string | null
  email: string
  phone: string | null
  country: string | null
  locale: string | null
  stage: string
  owner: string | null
  score: number | null
  budget_aed: number | null
  value_aed: number | null
  tags: string[]
  interests: string[]
  lost_reason: string | null
  lifecycle: string
  source: string | null
}

/** Stage, owner and the deal fields, each saved as soon as it changes. */
export function ContactSummary({ contact, agents }: { contact: ContactView; agents: { slug: string; name: string }[] }) {
  const { pending, run } = useAction()
  const save = (patch: Parameters<typeof updateContact>[1], undo?: () => void) => run(() => updateContact(contact.id, patch), undefined, undo)
  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))))
  const list = (v: string) => [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))]

  return (
    <section className={cn("rounded-2xl bg-white p-5 ring-1 ring-neutral-200", pending && "opacity-70")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-800">Stage</span>
          <select
            defaultValue={contact.stage}
            onChange={(e) => {
              const select = e.currentTarget
              save({ stage: select.value as (typeof STAGES)[number]["key"] }, () => (select.value = contact.stage))
            }}
            className="admin-input"
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-800">Owner</span>
          <select
            defaultValue={contact.owner ?? ""}
            onChange={(e) => {
              const select = e.currentTarget
              save({ owner: select.value || null }, () => (select.value = contact.owner ?? ""))
            }}
            className="admin-input"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {[
          ["Name", "name", contact.name ?? ""],
          ["Phone / WhatsApp", "phone", contact.phone ?? ""],
          ["Country", "country", contact.country ?? ""],
        ].map(([label, key, value]) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block font-medium text-neutral-800">{label}</span>
            <input defaultValue={value} onBlur={(e) => e.target.value !== value && save({ [key]: e.target.value.trim() || null })} className="admin-input" />
          </label>
        ))}
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-800">Lead score (0–100)</span>
          <input type="number" min={0} max={100} defaultValue={contact.score ?? ""} onBlur={(e) => save({ score: num(e.target.value) === null ? null : Math.min(100, num(e.target.value)!) })} className="admin-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-800">Budget (AED)</span>
          <input type="number" min={0} step={50000} defaultValue={contact.budget_aed ?? ""} onBlur={(e) => save({ budget_aed: num(e.target.value) })} className="admin-input" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-neutral-800">Deal value (AED)</span>
          <input type="number" min={0} step={50000} defaultValue={contact.value_aed ?? ""} onBlur={(e) => save({ value_aed: num(e.target.value) })} className="admin-input" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-neutral-800">Interests (comma separated)</span>
          <input defaultValue={contact.interests.join(", ")} placeholder="off-plan, Dubai Marina, Golden Visa" onBlur={(e) => save({ interests: list(e.target.value) })} className="admin-input" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-neutral-800">Tags (comma separated)</span>
          <input defaultValue={contact.tags.join(", ")} placeholder="VIP, investor, cash buyer" onBlur={(e) => save({ tags: list(e.target.value) })} className="admin-input" />
        </label>
        {contact.stage === "lost" && (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-neutral-800">Why it was lost</span>
            <input defaultValue={contact.lost_reason ?? ""} onBlur={(e) => save({ lost_reason: e.target.value || null })} className="admin-input" />
          </label>
        )}
      </div>
    </section>
  )
}

const KINDS = [
  { key: "note", label: "Note", icon: NotebookPen },
  { key: "call", label: "Call", icon: Phone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "email", label: "Email", icon: Mail },
] as const

/** Log what happened: a note, a call, a WhatsApp chat or an email sent outside the system. */
export function ActivityComposer({ contactId }: { contactId: string }) {
  const { pending, run } = useAction()
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("note")
  const [body, setBody] = useState("")
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim()) run(() => logActivity(contactId, kind, body), () => setBody(""))
      }}
      className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200"
    >
      <div className="flex flex-wrap gap-1">
        {KINDS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setKind(key)} aria-pressed={kind === key} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", kind === key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={kind === "note" ? "Write a note…" : `What was discussed on the ${kind === "whatsapp" ? "WhatsApp chat" : kind}?`} className="admin-input mt-3 h-auto py-2" />
      <div className="mt-2 flex justify-end">
        <button disabled={pending || !body.trim()} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Log {KINDS.find((k) => k.key === kind)?.label.toLowerCase()}
        </button>
      </div>
    </form>
  )
}

export function DeleteActivity({ id }: { id: string }) {
  const { pending, run } = useAction()
  return (
    <button type="button" disabled={pending} onClick={() => confirm("Delete this entry?") && run(() => deleteActivity(id))} aria-label="Delete entry" className="text-neutral-300 hover:text-red-600">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export type TaskView = { id: string; title: string; due_at: string; done_at: string | null; assignee: string | null }

export function TaskPanel({ contactId, tasks, agents, defaultAssignee }: { contactId: string; tasks: TaskView[]; agents: { slug: string; name: string }[]; defaultAssignee: string | null }) {
  const { pending, run } = useAction()
  // Due times are Dubai time, whatever the browser's timezone (and the same on the server).
  const tomorrow = new Date(Date.now() + DUBAI_OFFSET_MS + 86_400_000).toISOString().slice(0, 10)
  const [title, setTitle] = useState("")
  const [due, setDue] = useState(`${tomorrow}T10:00`)
  const [assignee, setAssignee] = useState(defaultAssignee ?? "")
  const names = Object.fromEntries(agents.map((a) => [a.slug, a.name]))
  const now = Date.now()

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
      <h2 className="font-semibold text-neutral-900">Tasks and follow-ups</h2>
      <ul className="mt-3 space-y-2">
        {tasks.map((t) => {
          const overdue = !t.done_at && new Date(t.due_at).getTime() < now
          return (
            <li key={t.id} className="flex items-start gap-3 text-sm">
              <button type="button" disabled={pending} onClick={() => run(() => completeTask(t.id, !t.done_at))} aria-label={t.done_at ? "Mark as not done" : "Mark as done"} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1", t.done_at ? "bg-emerald-600 text-white ring-emerald-600" : "ring-neutral-300 hover:ring-neutral-500")}>
                {t.done_at && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="min-w-0 flex-1">
                <span className={cn("block", t.done_at && "text-neutral-400 line-through")}>{t.title}</span>
                <span className={cn("text-xs", overdue ? "font-semibold text-red-600" : "text-neutral-500")}>
                  {new Date(t.due_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })} · {relative(t.due_at, now)}
                  {t.assignee && ` · ${names[t.assignee] ?? t.assignee}`}
                </span>
              </span>
              <button type="button" disabled={pending} onClick={() => run(() => deleteTask(t.id))} aria-label="Delete task" className="text-neutral-300 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </li>
          )
        })}
        {!tasks.length && <li className="text-sm text-neutral-500">No tasks yet.</li>}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (title.trim()) run(() => addTask(contactId, { title, dueAt: new Date(`${due}:00+04:00`).toISOString(), assignee: assignee || null }), () => setTitle(""))
        }}
        className="mt-4 grid gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-[1fr_auto]"
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send Marina brochure" className="admin-input sm:col-span-2" aria-label="Task" />
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="admin-input" aria-label="Due (Dubai time)" title="Dubai time" />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="admin-input w-auto" aria-label="Assignee">
          <option value="">Anyone</option>
          {agents.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
        <button disabled={pending || !title.trim()} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">
          Add task
        </button>
      </form>
    </section>
  )
}

export function DeleteContactButton({ id }: { id: string }) {
  const router = useRouter()
  const { pending, run } = useAction()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Delete this person and everything held about them (enquiries, bookings, notes)? This can't be undone.") && run(() => deleteContact(id), () => router.push("/admin/crm"))}
      className="text-sm text-red-700 hover:underline"
    >
      Delete contact and their data
    </button>
  )
}
