"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Loader2, MapPin, Trash2 } from "lucide-react"
import type { FormState } from "@/app/[locale]/admin/actions"
import { deleteContent, geocode, saveCommunity, saveDeveloper, saveJob, saveProject, saveReport } from "@/app/[locale]/admin/content-actions"
import { Field, LocalizedField, Section } from "@/components/admin/fields"
import { MediaUploader } from "@/components/admin/media-uploader"
import { browserClient } from "@/lib/supabase/browser"
import { useFormAction } from "@/components/admin/use-form-action"
import { unwrap } from "@/lib/action-result"

type L = Record<string, string>
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(Math.round(v * 1000) / 10))

function Shell({ state, pending, back, label, children }: { state: FormState; pending: boolean; back: string; label: string; children: React.ReactNode }) {
  return (
    <>
      {state.status === "error" && state.message && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.message}</p>}
      {children}
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-50/90 py-4 backdrop-blur">
        <Link href={back} className="rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {label}
        </button>
      </div>
    </>
  )
}

function SlugField({ value, onChange, error, prefix }: { value: string; onChange: (v: string) => void; error?: string; prefix: string }) {
  return (
    <Field label="URL slug" error={error} hint={`${prefix}${value || "…"}`}>
      <input name="slug" required value={value} onChange={(e) => onChange(e.target.value)} className="admin-input" />
    </Field>
  )
}

/** Latitude/longitude with a "find it" lookup by place name (OpenStreetMap). */
function GeoFields({ lat, lng, guess, errors }: { lat?: number; lng?: number; guess: string; errors: Record<string, string> }) {
  const [coords, setCoords] = useState({ lat: lat?.toString() ?? "", lng: lng?.toString() ?? "" })
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string | null>(null)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Latitude" error={errors.lat}>
        <input name="lat" required value={coords.lat} onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))} className="admin-input" inputMode="decimal" />
      </Field>
      <Field label="Longitude" error={errors.lng}>
        <input name="lng" required value={coords.lng} onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))} className="admin-input" inputMode="decimal" />
      </Field>
      <div className="self-end">
        <button
          type="button"
          disabled={pending || !guess}
          onClick={() =>
            start(async () => {
              const hit = await unwrap(geocode(`${guess}, Dubai`)).catch(() => null)
              if (hit) {
                setCoords({ lat: String(hit.lat), lng: String(hit.lng) })
                setNote(hit.label)
              } else setNote("Not found. Type the coordinates, or try a different name.")
            })
          }
          className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Find on the map
        </button>
      </div>
      {note && <p className="text-xs text-neutral-500 sm:col-span-3">{note}</p>}
    </div>
  )
}

export function DeleteContent({ table, slug, back }: { table: "communities" | "developers" | "projects" | "reports" | "jobs"; slug: string; back: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        confirm("Delete this permanently?") &&
        start(async () => {
          try {
            await unwrap(deleteContent(table, slug))
            router.push(back)
            router.refresh()
          } catch (e) {
            alert(e instanceof Error ? e.message : "Couldn't delete.")
          }
        })
      }
      className="inline-flex items-center gap-1.5 text-sm text-red-700 hover:underline"
    >
      <Trash2 className="h-4 w-4" /> Delete
    </button>
  )
}

/* ── Community ─────────────────────────────────────────────────────────── */

export type CommunityRow = { slug: string; name: string; summary: L; lifestyle: L; schools: L; transport: L; avg_price_per_sqft: number | null; est_yield: number | null; price_change_12m: number | null; lat: number; lng: number; waterfront: boolean; dld_areas: string[]; published: boolean }

export function CommunityForm({ row }: { row?: CommunityRow }) {
  const { state, pending, form } = useFormAction(saveCommunity.bind(null, row?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [name, setName] = useState(row?.name ?? "")
  const [slug, setSlug] = useState(row?.slug ?? "")
  return (
    <form {...form} className="space-y-6">
      <Shell state={state} pending={pending} back="/admin/communities" label="Save community">
        <Section title="Community">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.name}>
              <input name="name" required value={name} onChange={(ev) => (setName(ev.target.value), !row && setSlug(slugify(ev.target.value)))} className="admin-input" />
            </Field>
            <SlugField value={slug} onChange={setSlug} error={e.slug} prefix="/communities/" />
          </div>
          <LocalizedField name="summary" label="Summary (two sentences)" value={row?.summary} multiline error={e["summary.en"]} />
          <LocalizedField name="lifestyle" label="Lifestyle" value={row?.lifestyle} multiline />
          <LocalizedField name="schools" label="Schools nearby" value={row?.schools} multiline />
          <LocalizedField name="transport" label="Getting around" value={row?.transport} multiline />
        </Section>
        <Section title="Location">
          <GeoFields lat={row?.lat} lng={row?.lng} guess={name} errors={e} />
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="waterfront" defaultChecked={row?.waterfront} /> Waterfront (sea, marina, creek or canal)
          </label>
        </Section>
        <Section title="Market figures">
          <p className="text-sm text-neutral-500">Filled in automatically from Dubai Land Department sales once the DLD area names below are set and data is imported (Market data). You can enter figures by hand until then.</p>
          <Field label="DLD area names (comma separated)" hint="Exactly as in DLD data, e.g. Marsa Dubai for Dubai Marina">
            <input name="dld_areas" defaultValue={row?.dld_areas?.join(", ") ?? ""} className="admin-input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Average price (AED per sq ft)" error={e.avg_price_per_sqft}>
              <input name="avg_price_per_sqft" type="number" min={0} defaultValue={row?.avg_price_per_sqft ?? ""} className="admin-input" />
            </Field>
            <Field label="Gross rental yield (%)" error={e.est_yield}>
              <input name="est_yield" type="number" step={0.1} min={0} max={100} defaultValue={pct(row?.est_yield)} className="admin-input" />
            </Field>
            <Field label="Price change, last 12 months (%)" error={e.price_change_12m}>
              <input name="price_change_12m" type="number" step={0.1} defaultValue={pct(row?.price_change_12m)} className="admin-input" />
            </Field>
          </div>
        </Section>
        <Section title="Visibility">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={row?.published ?? true} /> Show on the website
          </label>
        </Section>
      </Shell>
    </form>
  )
}

/* ── Developer ─────────────────────────────────────────────────────────── */

export type DeveloperRow = { slug: string; name: string; founded: number | null; summary: L; logo_url: string | null; delivered_projects: number | null; on_time_rate: number | null; promises_kept: number | null; published: boolean }

export function DeveloperForm({ row }: { row?: DeveloperRow }) {
  const { state, pending, form } = useFormAction(saveDeveloper.bind(null, row?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [slug, setSlug] = useState(row?.slug ?? "")
  return (
    <form {...form} className="space-y-6">
      <Shell state={state} pending={pending} back="/admin/developers" label="Save developer">
        <Section title="Developer">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" error={e.name}>
              <input name="name" required defaultValue={row?.name} onChange={(ev) => !row && setSlug(slugify(ev.target.value))} className="admin-input" />
            </Field>
            <SlugField value={slug} onChange={setSlug} error={e.slug} prefix="/developers/" />
            <Field label="Founded (year)" error={e.founded}>
              <input name="founded" type="number" min={1900} max={2100} defaultValue={row?.founded ?? ""} className="admin-input" />
            </Field>
          </div>
          <LocalizedField name="summary" label="Summary" value={row?.summary} multiline error={e["summary.en"]} />
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-800">Logo</p>
            <MediaUploader name="logo_url" folder={`developers/${slug || "draft"}`} single initial={row?.logo_url ? [{ src: row.logo_url, alt: { en: row.name } }] : []} />
          </div>
        </Section>
        <Section title="Track record (verified figures only)">
          <p className="text-sm text-neutral-500">These feed the Handover Truth Score and the Promise Ledger. Leave them empty until checked against DLD records or the developer&apos;s handover history; the site then shows &ldquo;no verified record yet&rdquo;.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Delivered projects" error={e.delivered_projects}>
              <input name="delivered_projects" type="number" min={0} defaultValue={row?.delivered_projects ?? ""} className="admin-input" />
            </Field>
            <Field label="Delivered on time (%)" error={e.on_time_rate}>
              <input name="on_time_rate" type="number" step={0.1} min={0} max={100} defaultValue={pct(row?.on_time_rate)} className="admin-input" />
            </Field>
            <Field label="Promises kept (%)" error={e.promises_kept} hint="Calculated from Track record entries when there are any">
              <input name="promises_kept" type="number" step={0.1} min={0} max={100} defaultValue={pct(row?.promises_kept)} className="admin-input" />
            </Field>
          </div>
        </Section>
        <Section title="Visibility">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={row?.published ?? true} /> Show on the website
          </label>
        </Section>
      </Shell>
    </form>
  )
}

/* ── Off-plan project ──────────────────────────────────────────────────── */

export type ProjectRow = {
  slug: string
  name: string
  developer_slug: string
  community_slug: string
  summary: L
  launch_price_aed: number | null
  handover: string
  launched_on: string | null
  payment_plan: { onBooking: number; duringConstruction: number; onHandover: number; postHandover: number }
  unit_types: string | null
  construction_progress: number
  escrow_registered: boolean
  floors: number | null
  lat: number
  lng: number
  published: boolean
}

export function ProjectForm({ row, developers, communities }: { row?: ProjectRow; developers: { slug: string; name: string }[]; communities: { slug: string; name: string }[] }) {
  const { state, pending, form } = useFormAction(saveProject.bind(null, row?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [name, setName] = useState(row?.name ?? "")
  const [slug, setSlug] = useState(row?.slug ?? "")
  const plan = row?.payment_plan ?? { onBooking: 20, duringConstruction: 40, onHandover: 40, postHandover: 0 }
  if (!developers.length || !communities.length)
    return (
      <p className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">
        Add at least one <Link href="/admin/developers/new" className="underline">developer</Link> and one <Link href="/admin/communities/new" className="underline">community</Link> first.
      </p>
    )
  return (
    <form {...form} className="space-y-6">
      <Shell state={state} pending={pending} back="/admin/projects" label="Save project">
        <Section title="Project">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.name}>
              <input name="name" required value={name} onChange={(ev) => (setName(ev.target.value), !row && setSlug(slugify(ev.target.value)))} className="admin-input" />
            </Field>
            <SlugField value={slug} onChange={setSlug} error={e.slug} prefix="/off-plan/" />
            <Field label="Developer">
              <select name="developer_slug" defaultValue={row?.developer_slug} className="admin-input">
                {developers.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Community">
              <select name="community_slug" defaultValue={row?.community_slug} className="admin-input">
                {communities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <LocalizedField name="summary" label="Summary" value={row?.summary} multiline error={e["summary.en"]} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Launch price from (AED)" error={e.launch_price_aed}>
              <input name="launch_price_aed" type="number" min={0} step={10000} defaultValue={row?.launch_price_aed ?? ""} className="admin-input" />
            </Field>
            <Field label="Unit types" hint="e.g. 1–3 bed apartments">
              <input name="unit_types" defaultValue={row?.unit_types ?? ""} className="admin-input" />
            </Field>
            <Field label="Floors" error={e.floors} hint="For the Future Skyline View">
              <input name="floors" type="number" min={1} max={250} defaultValue={row?.floors ?? ""} className="admin-input" />
            </Field>
          </div>
        </Section>
        <Section title="Schedule and payment plan">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Launched" hint="For the Handover Truth Score">
              <input name="launched_on" type="date" defaultValue={row?.launched_on ?? ""} className="admin-input" />
            </Field>
            <Field label="Handover" error={e.handover}>
              <input name="handover" type="date" required defaultValue={row?.handover ?? ""} className="admin-input" />
            </Field>
            <Field label="Construction progress (%)" error={e.construction_progress} hint="Record dated readings in Track record">
              <input name="construction_progress" type="number" min={0} max={100} step={0.5} defaultValue={row ? Math.round(row.construction_progress * 1000) / 10 : 0} className="admin-input" />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-neutral-800">
              <input type="checkbox" name="escrow_registered" defaultChecked={row?.escrow_registered} /> Escrow registered (RERA)
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {(
              [
                ["onBooking", "On booking (%)"],
                ["duringConstruction", "During construction (%)"],
                ["onHandover", "On handover (%)"],
                ["postHandover", "After handover (%)"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <input name={`plan.${k}`} type="number" min={0} max={100} defaultValue={plan[k]} className="admin-input" />
              </Field>
            ))}
          </div>
          {e.payment_plan && <p className="text-sm text-red-600">{e.payment_plan}</p>}
        </Section>
        <Section title="Location">
          <GeoFields lat={row?.lat} lng={row?.lng} guess={name} errors={e} />
        </Section>
        <Section title="Visibility">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={row?.published} /> Published (shown in Off-plan)
          </label>
        </Section>
      </Shell>
    </form>
  )
}

/* ── Report or guide (private PDF) ─────────────────────────────────────── */

export type ReportRow = { slug: string; kind: "report" | "guide"; title: L; quarter: string; summary: L; file_path: string | null; published: boolean }

function PdfUpload({ initial, folder }: { initial: string | null; folder: string }) {
  const [path, setPath] = useState(initial ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <input type="hidden" name="file_path" value={path} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {path ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
            <FileText className="h-4 w-4 text-rose-600" /> {path.split("/").pop()}
          </span>
        ) : (
          <span className="text-neutral-500">No PDF yet</span>
        )}
        <label className="cursor-pointer rounded-full px-4 py-2 font-medium ring-1 ring-neutral-200 hover:bg-neutral-50">
          {busy ? "Uploading…" : path ? "Replace PDF" : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={async (ev) => {
              const file = ev.target.files?.[0]
              if (!file) return
              if (file.type !== "application/pdf" || file.size > 50 * 1024 * 1024) return setError("Use a PDF of 50 MB or less.")
              setBusy(true)
              setError(null)
              const next = `${folder}/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`
              const { error: upErr } = await browserClient().storage.from("documents").upload(next, file, { contentType: "application/pdf" })
              setBusy(false)
              if (upErr) setError(upErr.message)
              else setPath(next)
            }}
          />
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-neutral-500">Stored privately. People receive a download link that works for seven days after leaving their email.</p>
    </div>
  )
}

export function ReportForm({ row }: { row?: ReportRow }) {
  const { state, pending, form } = useFormAction(saveReport.bind(null, row?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [slug, setSlug] = useState(row?.slug ?? "")
  return (
    <form {...form} className="space-y-6">
      <Shell state={state} pending={pending} back="/admin/reports" label="Save">
        <Section title="Document">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <select name="kind" defaultValue={row?.kind ?? "report"} className="admin-input">
                <option value="report">Market report (Market reports page)</option>
                <option value="guide">Investor guide (the &ldquo;free guide&rdquo; offer)</option>
              </select>
            </Field>
            <Field label="Period" error={e.quarter} hint="e.g. Q3 2026, or 2026 for the guide">
              <input name="quarter" required defaultValue={row?.quarter ?? ""} className="admin-input" />
            </Field>
            <SlugField value={slug} onChange={setSlug} error={e.slug} prefix="" />
          </div>
          <LocalizedField name="title" label="Title" value={row?.title} error={e["title.en"]} onEnglishChange={(t) => !row && setSlug(slugify(t))} />
          <LocalizedField name="summary" label="Summary" value={row?.summary} multiline error={e["summary.en"]} />
          <PdfUpload initial={row?.file_path ?? null} folder={`reports/${slug || "draft"}`} />
        </Section>
        <Section title="Visibility">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={row?.published} /> Published
          </label>
        </Section>
      </Shell>
    </form>
  )
}

/* ── Job ───────────────────────────────────────────────────────────────── */

export type JobRow = { slug: string; title: L; location: string; type: L; summary: L; requirements: L[]; published: boolean }

export function JobForm({ row }: { row?: JobRow }) {
  const { state, pending, form } = useFormAction(saveJob.bind(null, row?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [slug, setSlug] = useState(row?.slug ?? "")
  const requirements = Object.fromEntries(Object.keys(row?.requirements?.[0] ?? { en: "" }).map((l) => [l, (row?.requirements ?? []).map((r) => r[l] ?? "").join("\n")]))
  return (
    <form {...form} className="space-y-6">
      <Shell state={state} pending={pending} back="/admin/jobs" label="Save role">
        <Section title="Role">
          <LocalizedField name="title" label="Job title" value={row?.title} error={e["title.en"]} onEnglishChange={(t) => !row && setSlug(slugify(t))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SlugField value={slug} onChange={setSlug} error={e.slug} prefix="/careers/" />
            <Field label="Location" error={e.location}>
              <input name="location" defaultValue={row?.location ?? "Dubai"} className="admin-input" />
            </Field>
          </div>
          <LocalizedField name="type" label="Type" value={row?.type ?? { en: "Full time" }} error={e["type.en"]} />
          <LocalizedField name="summary" label="Summary" value={row?.summary} multiline error={e["summary.en"]} />
          <LocalizedField name="requirements" label="Requirements (one per line)" value={requirements} multiline />
        </Section>
        <Section title="Visibility">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={row?.published} /> Published (shown in Careers)
          </label>
        </Section>
      </Shell>
    </form>
  )
}
