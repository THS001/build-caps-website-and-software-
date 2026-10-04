import { NextResponse, type NextRequest } from "next/server"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { siteSearch } from "@/lib/search/site-search"

/** GET /api/search?q=marina&locale=en: instant results for the search palette (no AI). */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120)
  const l = request.nextUrl.searchParams.get("locale") ?? "en"
  const locale = hasLocale(routing.locales, l) ? l : "en"
  const groups = q.length >= 2 ? await siteSearch(q, locale) : []
  return NextResponse.json({ groups }, { headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } })
}
