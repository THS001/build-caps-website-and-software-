"use client"

import { useState } from "react"
import Link from "next/link"
import en from "@/messages/en.json"
import { saveProperty } from "@/app/[locale]/admin/actions"
import { Checkboxes, Field, LocalizedField, Section } from "@/components/admin/fields"
import { MediaUploader, type MediaItem } from "@/components/admin/media-uploader"
import { useFormAction } from "@/components/admin/use-form-action"

export type Option = { value: string; label: string }

export type PropertyRow = {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  status: string
  listing: string
  type: string
  community_slug: string
  developer_slug: string | null
  project_slug: string | null
  price_aed: number | null
  beds: number
  baths: number
  sqft: number
  handover: string | null
  payment_plan: Record<string, number> | null
  est_yield: number | null
  service_charge_per_sqft: number | null
  furnishing: string | null
  amenities: string[]
  keywords: string[]
  images: MediaItem[]
  lat: number
  lng: number
  permit: string
  permit_qr_url: string | null
  agent_slug: string | null
  featured: boolean
  badge: string | null
  published: boolean
}

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)

const plans = ["onBooking", "duringConstruction", "onHandover", "postHandover"] as const
const planLabels = { onBooking: "On booking %", duringConstruction: "During construction %", onHandover: "On handover %", postHandover: "After handover %" }

export function PropertyForm({
  property,
  communities,
  developers,
  projects,
  agents,
}: {
  property?: PropertyRow
  communities: Option[]
  developers: Option[]
  projects: Option[]
  agents: Option[]
}) {
  const { state, pending, form } = useFormAction(saveProperty.bind(null, property?.id ?? null))
  const [slug, setSlug] = useState(property?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!property)
  const [status, setStatus] = useState(property?.status ?? "offPlan")
  const e = state.fieldErrors ?? {}

  if (!communities.length)
    return (
      <p className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">
        Every listing belongs to a community. <Link href="/admin/communities/new" className="underline">Add a community</Link> first (and a{" "}
        <Link href="/admin/developers/new" className="underline">developer</Link> for off-plan units).
      </p>
    )

  const amenities = Object.entries(en.property.amenityList).map(([value, label]) => ({ value, label }))
  const keywords = Object.entries(en.property.keywordList).map(([value, label]) => ({ value, label }))

  return (
    <form {...form} className="space-y-6">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Section title="Listing">
        <LocalizedField
          name="title"
          label="Title"
          value={property?.title}
          error={e["title.en"]}
          onEnglishChange={(text) => !slugTouched && setSlug(toSlug(text))}
        />
        <LocalizedField name="description" label="Description" value={property?.description} multiline error={e["description.en"]} />
        <Field label="URL slug" error={e.slug} hint={`buildcaps.com/properties/${slug || "…"}`}>
          <input
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true)
              setSlug(toSlug(ev.target.value))
            }}
            className="admin-input"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select name="status" value={status} onChange={(ev) => setStatus(ev.target.value)} className="admin-input">
              <option value="offPlan">Off-plan</option>
              <option value="ready">Ready</option>
            </select>
          </Field>
          <Field label="Listing" error={e.listing}>
            <select name="listing" defaultValue={property?.listing ?? "sale"} className="admin-input">
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </Field>
          <Field label="Type">
            <select name="type" defaultValue={property?.type ?? "apartment"} className="admin-input">
              {Object.entries(en.common.types).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Community" error={e.community_slug}>
            <select name="community_slug" defaultValue={property?.community_slug ?? ""} className="admin-input">
              <option value="">Choose…</option>
              {communities.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Developer">
            <select name="developer_slug" defaultValue={property?.developer_slug ?? ""} className="admin-input">
              <option value="">—</option>
              {developers.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project (off-plan)">
            <select name="project_slug" defaultValue={property?.project_slug ?? ""} className="admin-input">
              <option value="">—</option>
              {projects.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={e.lat} hint="Right-click the building in Google Maps to copy its coordinates.">
            <input name="lat" type="number" step="any" defaultValue={property?.lat ?? 25.2} className="admin-input" />
          </Field>
          <Field label="Longitude" error={e.lng}>
            <input name="lng" type="number" step="any" defaultValue={property?.lng ?? 55.27} className="admin-input" />
          </Field>
        </div>
      </Section>

      <Section title="Price, size and plan">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Price (AED)" error={e.price_aed} hint="Leave empty for “price on request”">
            <input name="price_aed" type="number" min={1} defaultValue={property?.price_aed ?? ""} className="admin-input" />
          </Field>
          <Field label="Bedrooms" error={e.beds} hint="0 = studio">
            <input name="beds" type="number" min={0} max={20} defaultValue={property?.beds ?? 1} className="admin-input" />
          </Field>
          <Field label="Bathrooms" error={e.baths}>
            <input name="baths" type="number" min={0} max={20} defaultValue={property?.baths ?? 1} className="admin-input" />
          </Field>
          <Field label="Size (sq ft)" error={e.sqft}>
            <input name="sqft" type="number" min={1} defaultValue={property?.sqft ?? ""} className="admin-input" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Handover date" error={e.handover} hint={status === "offPlan" ? undefined : "Off-plan only"}>
            <input name="handover" type="date" defaultValue={property?.handover ?? ""} disabled={status !== "offPlan"} className="admin-input disabled:opacity-50" />
          </Field>
          <Field label="Est. gross yield (%)">
            <input name="est_yield_pct" type="number" step="0.1" min={0} max={30} defaultValue={property?.est_yield ? +(property.est_yield * 100).toFixed(2) : ""} className="admin-input" />
          </Field>
          <Field label="Service charge (AED/sq ft)">
            <input name="service_charge_per_sqft" type="number" step="0.01" min={0} defaultValue={property?.service_charge_per_sqft ?? ""} className="admin-input" />
          </Field>
          <Field label="Furnishing">
            <select name="furnishing" defaultValue={property?.furnishing ?? ""} className="admin-input">
              <option value="">—</option>
              <option value="furnished">Furnished</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="partly">Partly furnished</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-800">Payment plan (off-plan)</p>
          <div className="grid gap-4 sm:grid-cols-4">
            {plans.map((k) => (
              <Field key={k} label={planLabels[k]}>
                <input name={`plan.${k}`} type="number" min={0} max={100} defaultValue={property?.payment_plan?.[k] ?? ""} className="admin-input" />
              </Field>
            ))}
          </div>
          {e.payment_plan && <p className="mt-1 text-xs text-red-600">{e.payment_plan}</p>}
        </div>
      </Section>

      <Section title="Compliance">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="DLD advertising permit (Trakheesi)" error={e.permit} hint="Required by law. The listing can't be saved without it.">
            <input name="permit" defaultValue={property?.permit ?? ""} className="admin-input font-mono" />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-800">Permit QR code</p>
            <MediaUploader name="permit_qr_url" folder={`permits/${slug || "draft"}`} single initial={property?.permit_qr_url ? [{ src: property.permit_qr_url, alt: { en: "" } }] : []} />
          </div>
        </div>
      </Section>

      <Section title="Photos">
        <MediaUploader name="images" folder={`properties/${slug || "draft"}`} initial={property?.images ?? []} />
      </Section>

      <Section title="Features">
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-800">Amenities</p>
          <Checkboxes name="amenities" options={amenities} selected={property?.amenities} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-800">Highlights</p>
          <Checkboxes name="keywords" options={keywords} selected={property?.keywords} />
        </div>
      </Section>

      <Section title="Publishing">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Advisor">
            <select name="agent_slug" defaultValue={property?.agent_slug ?? ""} className="admin-input">
              <option value="">—</option>
              {agents.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Badge">
            <select name="badge" defaultValue={property?.badge ?? ""} className="admin-input">
              <option value="">None</option>
              <option value="newLaunch">New launch</option>
              <option value="exclusive">Exclusive</option>
              <option value="soldOut">Sold out</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="featured" defaultChecked={property?.featured} className="h-4 w-4 accent-rose-500" />
            Featured on the home page
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="published" defaultChecked={property?.published} className="h-4 w-4 accent-rose-500" />
            Published (visible on the site)
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50/90 py-4 backdrop-blur">
        <Link href="/admin/properties" className="rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save listing"}
        </button>
      </div>
    </form>
  )
}
