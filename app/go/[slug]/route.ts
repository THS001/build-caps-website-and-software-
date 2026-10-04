import { NextResponse, type NextRequest } from "next/server"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { getFunnel } from "@/lib/data"
import { logFunnelClick } from "@/lib/leads"

/**
 * Funnel redirector for Opportunities cards: logs the click (funnel, source page,
 * locale, incoming UTM), adds UTM tags and 302s to the external briefing.
 * Expired or unknown funnels fall back to /opportunities.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const funnel = await getFunnel(slug)
  const today = new Date().toISOString().slice(0, 10)
  const live = funnel && funnel.startsAt <= today && (!funnel.endsAt || funnel.endsAt >= today)

  const incoming = request.nextUrl.searchParams
  const lang = incoming.get("lang") ?? undefined
  if (!live) {
    const prefix = lang && lang !== "en" && hasLocale(routing.locales, lang) ? `/${lang}` : ""
    return NextResponse.redirect(new URL(`${prefix}/opportunities`, request.url), 302)
  }

  const utm = Object.fromEntries([...incoming.entries()].filter(([key]) => key.startsWith("utm_")).map(([k, v]) => [k, v.slice(0, 120)]))
  if (funnel.id) {
    await logFunnelClick({ funnelId: funnel.id, source: incoming.get("src") ?? undefined, locale: lang, utm, referrer: request.headers.get("referer") ?? undefined })
  }

  const target = new URL(funnel.externalUrl)
  target.searchParams.set("utm_source", utm.utm_source ?? "buildcaps.com")
  target.searchParams.set("utm_medium", utm.utm_medium ?? "opportunities")
  target.searchParams.set("utm_campaign", utm.utm_campaign ?? funnel.slug)
  const src = incoming.get("src")
  if (src) target.searchParams.set("utm_content", src)
  if (lang) target.searchParams.set("lang", lang)

  const response = NextResponse.redirect(target, 302)
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Robots-Tag", "noindex")
  return response
}
