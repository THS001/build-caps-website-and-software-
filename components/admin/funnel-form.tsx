"use client"

import { useState } from "react"
import Link from "next/link"
import { localeNames, locales } from "@/i18n/locales"
import { saveFunnel } from "@/app/[locale]/admin/actions"
import { Checkboxes, Field, LocalizedField, Section } from "@/components/admin/fields"
import { MediaUploader } from "@/components/admin/media-uploader"
import { useFormAction } from "@/components/admin/use-form-action"

export type FunnelRow = {
  id: string
  slug: string
  title: Record<string, string>
  pitch: Record<string, string>
  tag: Record<string, string>
  key_number: { label: Record<string, string>; value: string }
  external_url: string
  image_url: string | null
  starts_at: string
  ends_at: string | null
  locales: string[] | null
  sort_order: number
  active: boolean
}

export function FunnelForm({ funnel }: { funnel?: FunnelRow }) {
  const { state, pending, form } = useFormAction(saveFunnel.bind(null, funnel?.id ?? null))
  const [slug, setSlug] = useState(funnel?.slug ?? "")
  const e = state.fieldErrors ?? {}

  return (
    <form {...form} className="space-y-6">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Section title="Card">
        <LocalizedField name="title" label="Title" value={funnel?.title} error={e["title.en"]} />
        <LocalizedField name="pitch" label="Short pitch" value={funnel?.pitch} multiline error={e["pitch.en"]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <LocalizedField name="tag" label="Tag (e.g. New launch)" value={funnel?.tag} error={e["tag.en"]} />
          <Field label="URL slug" error={e.slug} hint={`Tracked link: /go/${slug || "…"}`}>
            <input name="slug" value={slug} onChange={(ev) => setSlug(ev.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} className="admin-input" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LocalizedField name="keyLabel" label="Key number label (e.g. From)" value={funnel?.key_number.label} error={e["key_number.label.en"]} />
          <Field label="Key number value (e.g. AED 1.65M)" error={e["key_number.value"]}>
            <input name="keyValue" defaultValue={funnel?.key_number.value} className="admin-input" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-800">Card image</p>
          <MediaUploader name="image_url" folder={`funnels/${slug || "draft"}`} single initial={funnel?.image_url ? [{ src: funnel.image_url, alt: { en: "" } }] : []} />
        </div>
      </Section>

      <Section title="Destination and schedule">
        <Field label="External funnel URL" error={e.external_url} hint="Visitors go through /go/[slug], which logs the click and adds UTM tags.">
          <input name="external_url" type="url" placeholder="https://" defaultValue={funnel?.external_url} className="admin-input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts" error={e.starts_at}>
            <input name="starts_at" type="date" defaultValue={funnel?.starts_at ?? new Date().toISOString().slice(0, 10)} className="admin-input" />
          </Field>
          <Field label="Ends (optional)" error={e.ends_at} hint="Hidden automatically after this date.">
            <input name="ends_at" type="date" defaultValue={funnel?.ends_at ?? ""} className="admin-input" />
          </Field>
          <Field label="Sort order" hint="Lower numbers show first.">
            <input name="sort_order" type="number" min={0} defaultValue={funnel?.sort_order ?? 100} className="admin-input" />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-800">Show in languages (none ticked = all)</p>
          <Checkboxes name="locales" options={locales.map((l) => ({ value: l, label: localeNames[l] }))} selected={funnel?.locales ?? []} />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="active" defaultChecked={funnel?.active ?? true} className="h-4 w-4 accent-rose-500" />
          Active
        </label>
      </Section>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50/90 py-4 backdrop-blur">
        <Link href="/admin/funnels" className="rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save opportunity"}
        </button>
      </div>
    </form>
  )
}
