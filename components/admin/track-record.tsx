"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { addProgress, deletePromise, saveProjectFacts, savePromise, updatePromise } from "@/app/[locale]/admin/actions"
import { errorText, useFormAction } from "@/components/admin/use-form-action"
import { unwrap } from "@/lib/action-result"

type Option = { slug: string; name: string }
export type PromiseRow = { id: string; developer_slug: string; project_slug: string | null; category: string; promise: { en: string }; due: string | null; status: string; evidence: string | null; evidence_url: string | null; published: boolean }
export type ProjectRow = { slug: string; name: string; floors: number | null; launched_on: string | null; escrow_registered: boolean; construction_progress: number; handover: string }

const statuses = ["pending", "delivered", "partly", "broken"] as const
const categories = ["handover", "amenity", "specification", "payment", "community", "other"] as const

function useRefresh() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return {
    pending,
    run: (fn: () => Promise<unknown>) =>
      start(async () => {
        try {
          await unwrap(fn())
          router.refresh()
        } catch (e) {
          alert(e instanceof Error ? e.message : "Something went wrong.")
        }
      }),
  }
}

function EmptyNote({ what, href }: { what: string; href: string }) {
  return (
    <p className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">
      <Link href={href} className="underline">Add {what}</Link> first.
    </p>
  )
}

export function PromiseForm({ developers, projects }: { developers: Option[]; projects: Option[] }) {
  const { state, pending, form } = useFormAction(savePromise, { resetOnDone: true })
  if (!developers.length) return <EmptyNote what="a developer" href="/admin/developers/new" />
  return (
    <form {...form} className="grid gap-3 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 md:grid-cols-2">
      <p className="font-semibold text-neutral-900 md:col-span-2">Add a promise</p>
      <select name="developer_slug" required className="admin-input">
        {developers.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </select>
      <select name="project_slug" className="admin-input" defaultValue="">
        <option value="">All projects / general</option>
        {projects.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>
      <textarea name="promise" required placeholder="What was promised, e.g. “Handover Q4 2027” or “Infinity pool on the roof”" className="admin-input h-20 py-2 md:col-span-2" />
      <select name="category" className="admin-input">
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input name="due" type="date" className="admin-input" aria-label="Due date" />
      <input name="source" placeholder="Source (brochure name and date, SPA clause)" className="admin-input md:col-span-2" />
      <select name="status" className="admin-input">
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <input name="evidence_url" type="url" placeholder="Evidence link (photo, DLD record, news)" className="admin-input" />
      <textarea name="evidence" placeholder="Evidence notes" className="admin-input h-16 py-2 md:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="published" /> Show on the site (verified)
      </label>
      <div className="flex items-center gap-3 md:justify-end">
        {state.message && <span className={`text-sm ${state.status === "done" ? "text-emerald-700" : "text-red-600"}`}>{errorText(state)}</span>}
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add
        </button>
      </div>
    </form>
  )
}

export function PromiseList({ rows, developerNames }: { rows: PromiseRow[]; developerNames: Record<string, string> }) {
  const { pending, run } = useRefresh()
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-neutral-200">
          <span className="min-w-0 flex-1">
            <span className="font-medium text-neutral-900">{r.promise.en}</span>
            <span className="block text-xs text-neutral-500">
              {developerNames[r.developer_slug] ?? r.developer_slug}
              {r.project_slug && ` · ${r.project_slug}`} · {r.category}
              {r.due && ` · due ${r.due}`}
            </span>
          </span>
          <select value={r.status} disabled={pending} onChange={(e) => run(() => updatePromise(r.id, { status: e.target.value as (typeof statuses)[number] }))} className="admin-input h-9 w-32">
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-neutral-600">
            <input type="checkbox" checked={r.published} disabled={pending} onChange={(e) => run(() => updatePromise(r.id, { published: e.target.checked }))} /> Live
          </label>
          <button type="button" aria-label="Delete" disabled={pending} onClick={() => confirm("Delete this promise?") && run(() => deletePromise(r.id))} className="text-neutral-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
      {!rows.length && <li className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-neutral-200">No promises recorded yet.</li>}
    </ul>
  )
}

export function ProgressForm({ projects }: { projects: Option[] }) {
  const { state, pending, form } = useFormAction(addProgress, { resetOnDone: true })
  if (!projects.length) return <EmptyNote what="an off-plan project" href="/admin/projects/new" />
  return (
    <form {...form} className="grid gap-3 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 md:grid-cols-4">
      <p className="font-semibold text-neutral-900 md:col-span-4">Record construction progress</p>
      <select name="project_slug" required className="admin-input md:col-span-2">
        {projects.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>
      <input name="recorded_on" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="admin-input" aria-label="Date" />
      <input name="progress" type="number" min={0} max={100} step={0.5} required placeholder="% complete" className="admin-input" />
      <select name="source" className="admin-input">
        <option value="rera">RERA / DLD progress</option>
        <option value="site_visit">Our site visit</option>
        <option value="developer">Developer update</option>
        <option value="satellite">Satellite imagery</option>
      </select>
      <input name="note" placeholder="Note (optional)" className="admin-input md:col-span-2" />
      <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
      {state.message && <p className={`text-sm md:col-span-4 ${state.status === "done" ? "text-emerald-700" : "text-red-600"}`}>{errorText(state)}</p>}
    </form>
  )
}

export function ProjectFacts({ project }: { project: ProjectRow }) {
  const { pending, run } = useRefresh()
  const [floors, setFloors] = useState(project.floors?.toString() ?? "")
  const [launched, setLaunched] = useState(project.launched_on ?? "")
  const [escrow, setEscrow] = useState(project.escrow_registered)
  return (
    <tr className="border-t border-neutral-100">
      <td className="px-4 py-3 font-medium text-neutral-900">{project.name}</td>
      <td className="px-4 py-3 text-neutral-600">{Math.round(project.construction_progress * 100)}%</td>
      <td className="px-4 py-3">
        <input value={floors} onChange={(e) => setFloors(e.target.value)} type="number" min={1} max={250} className="admin-input h-9 w-20" aria-label="Floors" />
      </td>
      <td className="px-4 py-3">
        <input value={launched} onChange={(e) => setLaunched(e.target.value)} type="date" className="admin-input h-9" aria-label="Launch date" />
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={escrow} onChange={(e) => setEscrow(e.target.checked)} aria-label="Escrow registered" />
      </td>
      <td className="px-4 py-3 text-neutral-500">{project.handover}</td>
      <td className="px-4 py-3 text-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveProjectFacts(project.slug, { floors: floors ? Number(floors) : null, launched_on: launched || null, escrow_registered: escrow }))}
          className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-neutral-200 disabled:opacity-60"
        >
          Save
        </button>
      </td>
    </tr>
  )
}
