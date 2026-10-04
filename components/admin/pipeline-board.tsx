"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, Phone } from "lucide-react"
import { updateContact } from "@/app/[locale]/admin/crm-actions"
import { STAGES, relative, type Stage } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { unwrap } from "@/lib/action-result"

export type BoardContact = {
  id: string
  name: string | null
  email: string
  phone: string | null
  stage: Stage
  owner: string | null
  score: number | null
  value_aed: number | null
  budget_aed: number | null
  last_activity_at: string
  next_follow_up_at: string | null
  source: string | null
}

const aed = (n: number) => new Intl.NumberFormat("en-AE", { notation: "compact", maximumFractionDigits: 1 }).format(n)

/** Kanban by pipeline stage. Drag a card to another column (or use its menu) to move it. */
export function PipelineBoard({ contacts, owners }: { contacts: BoardContact[]; owners: Record<string, string> }) {
  const router = useRouter()
  const [items, setItems] = useState(contacts)
  useEffect(() => setItems(contacts), [contacts])
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const [, start] = useTransition()
  const now = Date.now()

  const move = (id: string, stage: Stage) => {
    const before = items
    setItems((list) => list.map((c) => (c.id === id ? { ...c, stage } : c)))
    start(async () => {
      try {
        await unwrap(updateContact(id, { stage }))
        router.refresh()
      } catch (e) {
        setItems(before)
        alert(e instanceof Error ? e.message : "Couldn't move the contact.")
      }
    })
  }

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-4 md:-mx-10 md:px-10">
      <div className="grid min-w-[1400px] grid-cols-7 gap-3">
        {STAGES.map((stage) => {
          const column = items.filter((c) => c.stage === stage.key)
          const value = column.reduce((s, c) => s + (c.value_aed ?? c.budget_aed ?? 0), 0)
          return (
            <section
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(stage.key)
              }}
              onDragLeave={() => setOver((o) => (o === stage.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                const id = e.dataTransfer.getData("text/plain")
                if (id && items.find((c) => c.id === id)?.stage !== stage.key) move(id, stage.key)
              }}
              className={cn("flex min-h-[60vh] flex-col rounded-2xl bg-neutral-100/70 p-2 transition-colors", over === stage.key && "bg-rose-50 ring-2 ring-rose-300")}
              aria-label={stage.label}
            >
              <header className="flex items-baseline justify-between px-2 py-2">
                <h2 className="text-sm font-semibold text-neutral-900">
                  {stage.label} <span className="font-normal text-neutral-500">{column.length}</span>
                </h2>
                {value > 0 && <span className="text-xs text-neutral-500">AED {aed(value)}</span>}
              </header>
              <ul className="flex-1 space-y-2">
                {column.map((c) => {
                  const overdue = c.next_follow_up_at && new Date(c.next_follow_up_at).getTime() < now
                  return (
                    <li
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id)
                        setDragging(c.id)
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cn("cursor-grab rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-neutral-200 active:cursor-grabbing", dragging === c.id && "opacity-50")}
                    >
                      <Link href={`/admin/crm/${c.id}`} className="block font-medium text-neutral-900 hover:text-rose-700">
                        {c.name ?? c.email}
                      </Link>
                      <p className="truncate text-xs text-neutral-500">{c.name ? c.email : c.source}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                        {c.owner && <span>{owners[c.owner] ?? c.owner}</span>}
                        {c.score !== null && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">{c.score}</span>}
                        {(c.value_aed ?? c.budget_aed) ? <span>AED {aed((c.value_aed ?? c.budget_aed)!)}</span> : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-neutral-400">{relative(c.last_activity_at, now)}</span>
                        {c.next_follow_up_at && (
                          <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-red-600" : "text-neutral-500")}>
                            <CalendarClock className="h-3 w-3" /> {relative(c.next_follow_up_at, now)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {c.phone && (
                          <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <select
                          aria-label="Move to stage"
                          value={c.stage}
                          onChange={(e) => move(c.id, e.target.value as Stage)}
                          className="ms-auto rounded-md border border-neutral-200 bg-white px-1 py-0.5 text-xs text-neutral-600"
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
