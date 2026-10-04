import "server-only"
import type { Locale } from "@/i18n/locales"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { emailConfigured, sendEmail } from "@/lib/email/send"
import { renderEmail } from "@/lib/email/templates"

// Gated PDFs (market reports, the investor guide) from the private "documents"
// bucket, handed out as signed links that expire after a week.

const WEEK = 7 * 24 * 3600

/** "report:<slug>" for a market report; anything else means the latest investor guide. */
export async function documentLink(source: string): Promise<{ url: string; title: string } | null> {
  if (!adminConfigured) return null
  const supabase = adminClient()
  const slug = source.startsWith("report:") ? source.slice(7) : null
  let query = supabase.from("reports").select("slug, title, file_path").eq("published", true).not("file_path", "is", null)
  query = slug ? query.eq("slug", slug).eq("kind", "report") : query.eq("kind", "guide").order("updated_at", { ascending: false })
  const { data } = await query.limit(1).maybeSingle()
  if (!data?.file_path) return null
  const filename = `buildcaps-${data.slug}.pdf`
  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(data.file_path, WEEK, { download: filename })
  return signed?.signedUrl ? { url: signed.signedUrl, title: (data.title as { en: string }).en } : null
}

/** Emails the link too (when an email provider is set up), so it can be opened later. */
export async function emailDocument(to: string, locale: Locale, doc: { url: string; title: string }) {
  if (!emailConfigured) return false
  const { html, text } = await renderEmail({
    locale,
    preheader: doc.title,
    heading: doc.title,
    paragraphs: ["Thank you for your interest. Your copy is ready to download (the link works for seven days).", "Questions about anything in it? Reply to this email and an advisor will get back to you."],
    cta: { label: "Download the PDF", href: doc.url },
  })
  return sendEmail({ to, subject: doc.title, html, text })
}
