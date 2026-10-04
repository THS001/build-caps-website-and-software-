import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { portalFeed, portals, type Portal } from "@/lib/feeds"

export const dynamic = "force-dynamic"

/**
 * /api/feeds/property-finder, /api/feeds/bayut, /api/feeds/dubizzle: the XML
 * the portals import. Private: each portal gets the URL with ?token=FEED_TOKEN.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params
  const expected = process.env.FEED_TOKEN
  const given = request.nextUrl.searchParams.get("token") ?? ""
  const ok = Boolean(expected) && given.length === expected!.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected!))
  if (!ok || !(portals as readonly string[]).includes(portal)) return NextResponse.json({ error: "not found" }, { status: 404 })

  const { xml, count } = await portalFeed(portal as Portal)
  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "private, max-age=900",
      "x-robots-tag": "noindex",
      "x-listing-count": String(count),
    },
  })
}
