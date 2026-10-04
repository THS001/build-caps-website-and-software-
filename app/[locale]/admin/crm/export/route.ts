import { NextResponse, type NextRequest } from "next/server"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import { STAGES } from "@/lib/crm"

export const dynamic = "force-dynamic"

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v)
  // Quote, and defuse spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

/** CSV of contacts (same filters as the CRM page). Staff only. */
export async function GET(request: NextRequest) {
  const staff = await currentStaff()
  if (!staff) return new NextResponse("Unauthorized", { status: 401 })
  const sp = request.nextUrl.searchParams
  const supabase = await serverClient()
  let query = supabase
    .from("contacts")
    .select("name, email, phone, country, locale, lifecycle, stage, owner, score, budget_aed, value_aed, interests, tags, source, created_at, last_activity_at, next_follow_up_at, lost_reason")
    .order("created_at", { ascending: false })
    .limit(10_000)
  const who = sp.get("who")
  query = who === "subscribers" ? query.eq("lifecycle", "subscriber") : who === "all" ? query : query.neq("lifecycle", "subscriber")
  const stage = STAGES.find((s) => s.key === sp.get("stage"))?.key
  if (stage) query = query.eq("stage", stage)
  if (sp.get("owner")) query = sp.get("owner") === "none" ? query.is("owner", null) : query.eq("owner", sp.get("owner")!)
  if (sp.get("source")) query = query.eq("source", sp.get("source")!)
  const { data, error } = await query
  if (error) return new NextResponse(error.message, { status: 500 })
  const columns = ["name", "email", "phone", "country", "locale", "lifecycle", "stage", "owner", "score", "budget_aed", "value_aed", "interests", "tags", "source", "created_at", "last_activity_at", "next_follow_up_at", "lost_reason"] as const
  const rows = (data ?? []).map((r) => columns.map((c) => cell((r as Record<string, unknown>)[c])).join(","))
  // Byte-order mark so Excel opens Arabic and other scripts correctly.
  const csv = String.fromCharCode(0xfeff) + [columns.join(","), ...rows].join("\r\n")
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="buildcaps-contacts-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  })
}
