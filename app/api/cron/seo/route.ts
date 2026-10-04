import { NextResponse, type NextRequest } from "next/server"
import { authorizedCron } from "@/lib/cron"
import { runSeoAgent } from "@/lib/seo-agent/run"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Weekly: SEO Growth Agent (dry run unless SEO_AGENT_MODE=live). */
export async function GET(request: NextRequest) {
  if (!(await authorizedCron(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json(await runSeoAgent({ trigger: "cron" }))
}
