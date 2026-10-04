"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import type { Locale } from "@/i18n/locales"
import { saveLead } from "@/lib/leads"
import { rateLimited, verifyHuman } from "@/lib/security"

export type LeadState = { status: "idle" | "success" | "error"; url?: string }

const guideSchema = z.object({
  email: z.string().trim().email().max(254),
  country: z.string().trim().max(80).optional(),
  locale: z.string().refine((l) => hasLocale(routing.locales, l)),
  source: z.string().max(80),
})

/** Investor Guide and market-report requests: saves the lead, then hands over (and emails) a download link. */
export async function requestGuide(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const parsed = guideSchema.safeParse({
    email: formData.get("email"),
    country: formData.get("country") || undefined,
    locale: formData.get("locale"),
    source: formData.get("source") ?? "unknown",
  })
  if (!parsed.success) return { status: "error" }
  if ((await rateLimited("guide", 5, 10 * 60_000)) || !(await verifyHuman(formData.get("cf-turnstile-response")))) return { status: "error" }
  const { source, ...rest } = parsed.data
  const ok = await saveLead({ kind: source.startsWith("report:") ? "report" : "guide", source, ...rest })
  if (!ok) return { status: "error" }
  const { documentLink, emailDocument } = await import("@/lib/documents")
  const doc = await documentLink(source)
  if (doc) await emailDocument(rest.email, rest.locale as Locale, doc)
  return { status: "success", url: doc?.url }
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  interest: z.enum(["buy", "rent", "sell", "valuation", "mortgage", "goldenVisa", "general"]),
  message: z.string().trim().max(4000).optional(),
  locale: z.string().refine((l) => hasLocale(routing.locales, l)),
  source: z.string().max(200),
})

/** Contact and enquiry forms. */
export async function submitEnquiry(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    interest: formData.get("interest"),
    message: formData.get("message") || undefined,
    locale: formData.get("locale"),
    source: formData.get("source") ?? "contact",
  })
  if (!parsed.success) return { status: "error" }
  if ((await rateLimited("enquiry", 5, 10 * 60_000)) || !(await verifyHuman(formData.get("cf-turnstile-response")))) return { status: "error" }
  const ok = await saveLead({ kind: "enquiry", ...parsed.data })
  return { status: ok ? "success" : "error" }
}
