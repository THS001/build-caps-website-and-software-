"use server"

import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { saveLead } from "@/lib/leads"
import { rateLimited, verifyHuman } from "@/lib/security"

export type NewsletterState = { status: "idle" | "success" | "error" }

const schema = z.object({
  email: z.string().trim().email().max(254),
  locale: z.string().refine((l) => hasLocale(routing.locales, l)),
})

export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = schema.safeParse({ email: formData.get("email"), locale: formData.get("locale") })
  if (!parsed.success) return { status: "error" }
  if ((await rateLimited("newsletter", 5, 10 * 60_000)) || !(await verifyHuman(formData.get("cf-turnstile-response")))) return { status: "error" }
  const ok = await saveLead({ kind: "newsletter", source: "newsletter", ...parsed.data })
  return { status: ok ? "success" : "error" }
}
