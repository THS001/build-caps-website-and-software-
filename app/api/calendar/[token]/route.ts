import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { icsCalendar } from "@/lib/booking/calendar-links"
import { site } from "@/lib/site"

export const dynamic = "force-dynamic"

const purposeLabel: Record<string, string> = { strategy: "Strategy call", viewing: "Viewing", valuation: "Valuation", mortgage: "Mortgage", goldenVisa: "Golden Visa" }
const modeLabel: Record<string, string> = { video: "Video call", office: "Office", onsite: "On site", whatsapp: "WhatsApp call" }

/**
 * Private iCal feed of bookings: one per advisor, or the whole office. The token
 * in the URL is the secret (Admin → Availability shows and regenerates it).
 * Subscribe from Google Calendar, Apple Calendar or Outlook; no API keys needed.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const id = token.replace(/\.ics$/, "")
  if (!adminConfigured || !z.string().uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 })
  const supabase = adminClient()
  const { data: feed } = await supabase.from("calendar_feeds").select("agent_slug").eq("token", id).maybeSingle()
  if (!feed) return new NextResponse("Not found", { status: 404 })

  const from = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const to = new Date(Date.now() + 180 * 86_400_000).toISOString()
  let query = supabase
    .from("appointments")
    .select("id, reference, purpose, mode, agent_slug, starts_at, ends_at, name, email, phone, language, notes, status, meeting_url, property_slug, contact_id, updated_at")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .in("status", ["confirmed", "completed", "cancelled"])
    .order("starts_at")
  if (feed.agent_slug) query = query.eq("agent_slug", feed.agent_slug)
  const [{ data: rows }, { data: agents }] = await Promise.all([query, supabase.from("agents").select("slug, name")])
  const names = new Map((agents ?? []).map((a) => [a.slug, a.name]))

  const events = (rows ?? []).map((a) => {
    const start = new Date(a.starts_at)
    const crm = a.contact_id ? new URL(`/admin/crm/${a.contact_id}`, site.url).toString() : ""
    return {
      id: a.id,
      start,
      minutes: Math.round((new Date(a.ends_at).getTime() - start.getTime()) / 60_000),
      title: `${purposeLabel[a.purpose] ?? a.purpose}: ${a.name}${feed.agent_slug ? "" : ` (${names.get(a.agent_slug) ?? a.agent_slug})`}`,
      description: [
        `${modeLabel[a.mode] ?? a.mode} · ${a.language.toUpperCase()} · Ref ${a.reference}`,
        `${a.phone} · ${a.email}`,
        a.meeting_url ? `Meeting link: ${a.meeting_url}` : "",
        a.property_slug ? `Property: ${new URL(`/properties/${a.property_slug}`, site.url)}` : "",
        a.notes ? `Note: ${a.notes}` : "",
        crm ? `CRM: ${crm}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      location: a.mode === "office" ? "Buildcaps Real Estate, Conrad Office Tower, Sheikh Zayed Road, Dubai" : (a.meeting_url ?? modeLabel[a.mode] ?? ""),
      status: a.status === "cancelled" ? ("CANCELLED" as const) : ("CONFIRMED" as const),
      updated: new Date(a.updated_at),
    }
  })
  const name = feed.agent_slug ? `Buildcaps bookings: ${names.get(feed.agent_slug) ?? feed.agent_slug}` : "Buildcaps bookings: all advisors"
  return new NextResponse(icsCalendar(name, events), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300", "content-disposition": `inline; filename="buildcaps-bookings.ics"` },
  })
}
