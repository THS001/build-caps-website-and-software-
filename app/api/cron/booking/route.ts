import { NextResponse, type NextRequest } from "next/server"
import { authorizedCron } from "@/lib/cron"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { bookableAdvisors } from "@/lib/booking/availability"
import { emailVisitor, type AdvisorContact, type Appointment } from "@/lib/booking/notify"
import { sendAdvisorBriefs } from "@/lib/ai/agents/copilot"
import { computeAdvisorScores } from "@/lib/ai/agents/advisor-score"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Booking lifecycle, every 15 minutes: 24-hour and 1-hour reminders, advisor
 * briefs 30 minutes before (Advisor Copilot), a feedback request after the meeting,
 * and once a day the Advisor Scores.
 */
export async function GET(request: NextRequest) {
  if (!authorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!adminConfigured) return NextResponse.json({ skipped: "Supabase service role not configured" })

  const supabase = adminClient()
  const now = Date.now()
  const iso = (ms: number) => new Date(now + ms).toISOString()
  const H = 3600_000
  const advisors = new Map((await bookableAdvisors()).map((a) => [a.slug, a as AdvisorContact]))
  const advisorOf = (a: Appointment) => advisors.get(a.agent_slug) ?? { slug: a.agent_slug, name: "Buildcaps", email: null, meetingUrl: null }
  const sent = { reminder24: 0, reminder1: 0, feedback: 0, briefs: 0 }

  const jobs: { kind: "reminder24" | "reminder1" | "feedback"; column: string; from: string; to: string; field: "starts_at" | "ends_at" }[] = [
    { kind: "reminder24", column: "reminder_24h_sent_at", from: iso(23 * H), to: iso(25 * H), field: "starts_at" },
    { kind: "reminder1", column: "reminder_1h_sent_at", from: iso(0.75 * H), to: iso(1.25 * H), field: "starts_at" },
    { kind: "feedback", column: "followup_sent_at", from: iso(-26 * H), to: iso(-2 * H), field: "ends_at" },
  ]

  for (const job of jobs) {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "confirmed")
      .is(job.column, null)
      .gte(job.field, job.from)
      .lte(job.field, job.to)
      .limit(100)
    for (const appt of (data ?? []) as Appointment[]) {
      // Claim the row first, so overlapping runs never send twice.
      const { data: claimed } = await supabase.from("appointments").update({ [job.column]: new Date().toISOString() }).eq("id", appt.id).is(job.column, null).select("id")
      if (!claimed?.length) continue
      if (await emailVisitor(job.kind, appt, advisorOf(appt))) sent[job.kind]++
    }
  }

  sent.briefs = await sendAdvisorBriefs(advisors)

  const { data: stalest } = await supabase.from("agents").select("score_at").eq("active", true).order("score_at", { ascending: true, nullsFirst: true }).limit(1)
  const due = stalest?.length && (!stalest[0].score_at || now - new Date(stalest[0].score_at).getTime() > 20 * H)
  const scored = due ? await computeAdvisorScores() : 0
  return NextResponse.json({ ok: true, sent, scored })
}
