"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { saveAgent } from "@/app/[locale]/admin/crm-actions"
import { Field } from "@/components/admin/fields"
import { MediaUploader } from "@/components/admin/media-uploader"
import { locales, localeNames } from "@/i18n/locales"
import { useFormAction } from "@/components/admin/use-form-action"

export type AgentRow = {
  slug: string
  name: string
  role: string
  languages: string[]
  specialties: string[]
  bio: Record<string, string>
  brn: string | null
  email: string | null
  meeting_url: string | null
  photo_url: string | null
  responds_within: string
  user_id: string | null
  sort_order: number
  active: boolean
}

const ROLES = [
  { value: "propertyAdvisor", label: "Property advisor" },
  { value: "seniorPropertyAdvisor", label: "Senior property advisor" },
  { value: "salesDirector", label: "Sales director" },
  { value: "ceo", label: "CEO (not bookable)" },
]

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export function AgentForm({ agent, staff }: { agent: AgentRow | null; staff: { id: string; name: string; role: string }[] }) {
  const { state, pending, form } = useFormAction(saveAgent.bind(null, agent?.slug ?? null))
  const e = state.fieldErrors ?? {}
  const [name, setName] = useState(agent?.name ?? "")
  const [slug, setSlug] = useState(agent?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(Boolean(agent))

  return (
    <form {...form} className="grid gap-5 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 md:grid-cols-2">
      <Field label="Full name" error={e.name}>
        <input
          name="name"
          required
          value={name}
          onChange={(ev) => {
            setName(ev.target.value)
            if (!slugTouched) setSlug(slugify(ev.target.value))
          }}
          className="admin-input"
        />
      </Field>
      <Field label="URL slug" error={e.slug} hint={`Profile: /team/${slug || "…"}`}>
        <input
          name="slug"
          required
          value={slug}
          onChange={(ev) => {
            setSlugTouched(true)
            setSlug(ev.target.value)
          }}
          className="admin-input"
        />
      </Field>
      <Field label="Role">
        <select name="role" defaultValue={agent?.role ?? "propertyAdvisor"} className="admin-input">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Email for bookings" error={e.email} hint="Booking notices and pre-meeting briefs go here">
        <input name="email" type="email" defaultValue={agent?.email ?? ""} className="admin-input" />
      </Field>
      <Field label="Video meeting link" error={e.meeting_url} hint="Their own Zoom, Teams or Meet room, used for every video booking. Leave empty for a free Jitsi room per booking.">
        <input name="meeting_url" type="url" placeholder="https://zoom.us/j/…" defaultValue={agent?.meeting_url ?? ""} className="admin-input" />
      </Field>
      <fieldset className="md:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-neutral-800">Languages spoken</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {locales.map((l) => (
            <label key={l} className="flex items-center gap-1.5">
              <input type="checkbox" name="languages" value={l} defaultChecked={agent ? agent.languages.includes(l) : l === "en"} /> {localeNames[l]}
            </label>
          ))}
        </div>
        {e.languages && <p className="mt-1 text-xs text-red-600">{e.languages}</p>}
      </fieldset>
      <Field label="Specialties (comma separated)" className="md:col-span-2">
        <input name="specialties" defaultValue={agent?.specialties.join(", ") ?? ""} placeholder="Off-plan, Dubai Marina, Golden Visa" className="admin-input" />
      </Field>
      <Field label="Short bio (English)" className="md:col-span-2" hint="Other languages come from the translation tools">
        <textarea name="bio_en" rows={4} defaultValue={agent?.bio.en ?? ""} className="admin-input h-auto py-2" />
      </Field>
      <Field label="RERA BRN" error={e.brn} hint="Shown on the profile once entered">
        <input name="brn" defaultValue={agent?.brn ?? ""} className="admin-input" />
      </Field>
      <Field label="Usually replies within">
        <select name="responds_within" defaultValue={agent?.responds_within ?? "1h"} className="admin-input">
          {["15m", "30m", "1h", "2h", "4h", "1d"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Staff login" hint="Links this advisor to an admin account (their tasks, “Mine” filters)">
        <select name="user_id" defaultValue={agent?.user_id ?? ""} className="admin-input">
          <option value="">Not linked</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Order on the team page" hint="Lower comes first">
        <input name="sort_order" type="number" min={0} defaultValue={agent?.sort_order ?? 100} className="admin-input" />
      </Field>
      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-medium text-neutral-800">Photo</p>
        <MediaUploader name="photo_url" folder={`team/${slug || "draft"}`} single initial={agent?.photo_url ? [{ src: agent.photo_url, alt: { en: agent.name } }] : []} />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input type="checkbox" name="active" defaultChecked={agent?.active ?? true} /> Active (shown on the site and bookable)
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save advisor
        </button>
        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      </div>
    </form>
  )
}
