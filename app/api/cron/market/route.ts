import { revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { authorizedCron } from "@/lib/cron"
import { CONTENT_TAG } from "@/lib/supabase/config"
import { runMarketIntel } from "@/lib/ai/agents/market-intel"
import { refreshSurroundings } from "@/lib/geo/surroundings"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Weekly: DLD ingest, community stats, draft market note (Market Intel agent), listing surroundings. */
export async function GET(request: NextRequest) {
  if (!(await authorizedCron(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const report = await runMarketIntel("cron")
  const surroundings = await refreshSurroundings({ limit: 15, budgetMs: 120_000 })
  revalidateTag(CONTENT_TAG)
  return NextResponse.json({ ...report, surroundings })
}
