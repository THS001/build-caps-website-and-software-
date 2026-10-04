"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { createContact } from "@/app/[locale]/admin/crm-actions"
import { Field } from "@/components/admin/fields"
import { SOURCES, STAGES } from "@/lib/crm"
import { locales, localeNames } from "@/i18n/locales"
import { useFormAction } from "@/components/admin/use-form-action"

/** Add a person by hand: a phone call, a walk-in, a referral. */
export function ContactForm({ agents }: { agents: { slug: string; name: string }[] }) {
  const { state, pending, form } = useFormAction(createContact)
  const e = state.fieldErrors ?? {}
  const existing = e.email?.startsWith("Already in the CRM: ") ? e.email.replace("Already in the CRM: ", "") : null

  return (
    <form {...form} className="grid gap-5 rounded-2xl bg-white p-6 ring-1 ring-neutral-200 md:grid-cols-2">
      <Field label="Full name" error={e.name}>
        <input name="name" required className="admin-input" />
      </Field>
      <Field label="Email" error={existing ? undefined : e.email}>
        <input name="email" type="email" required className="admin-input" />
        {existing && (
          <span className="mt-1 block text-xs text-red-600">
            Already in the CRM.{" "}
            <Link href={existing} className="underline">
              Open the contact
            </Link>
          </span>
        )}
      </Field>
      <Field label="Phone / WhatsApp" error={e.phone}>
        <input name="phone" className="admin-input" dir="ltr" />
      </Field>
      <Field label="Country" error={e.country}>
        <input name="country" className="admin-input" />
      </Field>
      <Field label="Language">
        <select name="locale" defaultValue="en" className="admin-input">
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Source">
        <select name="source" defaultValue="phone" className="admin-input">
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Stage">
        <select name="stage" defaultValue="new" className="admin-input">
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Owner">
        <select name="owner" defaultValue="" className="admin-input">
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Budget (AED)" error={e.budget_aed}>
        <input name="budget_aed" type="number" min={0} step={50000} className="admin-input" />
      </Field>
      <Field label="First note" className="md:col-span-2">
        <textarea name="note" rows={3} className="admin-input h-auto py-2" placeholder="What they're looking for, timeline, how they found us…" />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add contact
        </button>
        {state.status === "error" && !existing && <p className="text-sm text-red-600">{state.message}</p>}
      </div>
    </form>
  )
}
