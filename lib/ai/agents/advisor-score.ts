import "server-only"
import { createHash } from "node:crypto"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"
import { localeNames, locales } from "@/i18n/locales"
import type { AdvisorScore } from "@/lib/data/types"

// Advisor Score: computed from our own records only (CRM response times, meeting
// show rate, verified reviews, closed deals). An advisor is scored publicly only
// once there is enough data; Claude writes a two-sentence summary of strengths.

const DAY = 86_400_000
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

type Agent = { slug: string; name: string; languages: string[]; score: AdvisorScore | null }

async function factsFor(agent: Agent) {
  const supabase = adminClient()
  const since = (days: number) => new Date(Date.now() - days * DAY).toISOString()
  const [{ data: appts }, { data: reviews }, { data: contacts }] = await Promise.all([
    supabase.from("appointments").select("status").eq("agent_slug", agent.slug).gte("starts_at", since(365)).in("status", ["completed", "no_show"]),
    supabase.from("advisor_reviews").select("rating").eq("agent_slug", agent.slug).eq("published", true),
    supabase.from("contacts").select("id, stage, created_at").eq("owner", agent.slug).gte("created_at", since(365)),
  ])

  // First reply: the first call, email, WhatsApp or meeting logged after a website enquiry.
  const ids = (contacts ?? []).map((c) => c.id)
  const responses: number[] = []
  if (ids.length) {
    const [{ data: leads }, { data: touches }] = await Promise.all([
      supabase.from("leads").select("contact_id, created_at").in("contact_id", ids).gte("created_at", since(180)).order("created_at"),
      supabase.from("contact_activities").select("contact_id, created_at").in("contact_id", ids).in("kind", ["call", "email", "whatsapp", "meeting"]).not("author", "is", null).gte("created_at", since(180)).order("created_at"),
    ])
    const firstLead = new Map<string, number>()
    for (const l of leads ?? []) if (!firstLead.has(l.contact_id)) firstLead.set(l.contact_id, new Date(l.created_at).getTime())
    for (const [cid, at] of firstLead) {
      const reply = (touches ?? []).find((t) => t.contact_id === cid && new Date(t.created_at).getTime() >= at)
      if (reply) responses.push((new Date(reply.created_at).getTime() - at) / 60_000)
    }
  }

  const completed = (appts ?? []).filter((a) => a.status === "completed").length
  const noShows = (appts ?? []).filter((a) => a.status === "no_show").length
  const ratings = (reviews ?? []).map((r) => Number(r.rating))
  return {
    meetings: completed,
    showRate: completed + noShows >= 3 ? completed / (completed + noShows) : null,
    responseMinutes: responses.length >= 3 ? Math.round(median(responses)!) : null,
    rating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
    reviews: ratings.length,
    deals: (contacts ?? []).filter((c) => c.stage === "won").length,
    languages: agent.languages.length,
  }
}

function scoreOf(f: Awaited<ReturnType<typeof factsFor>>) {
  const parts: [number, number][] = []
  if (f.rating !== null) parts.push([0.35, (f.rating - 1) / 4])
  if (f.showRate !== null) parts.push([0.2, f.showRate])
  // 15 minutes or faster scores full marks; a day or slower scores nothing.
  if (f.responseMinutes !== null) parts.push([0.25, Math.min(1, Math.max(0, 1 - Math.log(Math.max(f.responseMinutes, 15) / 15) / Math.log(1440 / 15)))])
  parts.push([0.2, Math.min(1, f.deals / 6)])
  const weight = parts.reduce((s, [w]) => s + w, 0)
  return Math.round((100 * parts.reduce((s, [w, v]) => s + w * v, 0)) / weight)
}

function strengthsOf(f: Awaited<ReturnType<typeof factsFor>>): AdvisorScore["strengths"] {
  const out: AdvisorScore["strengths"] = []
  if (f.rating !== null && f.rating >= 4.7 && f.reviews >= 3) out.push("topRated")
  if (f.responseMinutes !== null && f.responseMinutes <= 30) out.push("fastResponse")
  if (f.showRate !== null && f.showRate >= 0.85) out.push("reliable")
  if (f.deals >= 3) out.push("dealMaker")
  if (f.languages >= 3) out.push("multilingual")
  return out
}

async function summarise(agent: Agent, facts: object) {
  const { value, usage } = await structured<Record<string, string>>({
    model: MODELS.fast,
    system: `Write two short sentences (max 40 words) on a Dubai property advisor's strengths, for their public profile, in each requested language. Third person, by first name ("${agent.name.split(" ")[0]}"). Use only the facts given; do not mention weaknesses or exact numbers you were not given.`,
    messages: [{ role: "user", content: JSON.stringify({ advisor: agent.name, facts, languages: Object.fromEntries(locales.map((l) => [l, localeNames[l]])) }) }],
    name: "advisor_summary",
    description: "The summary in every language",
    schema: { type: "object", properties: Object.fromEntries(locales.map((l) => [l, { type: "string" }])), required: [...locales] },
    maxTokens: 2500,
  })
  await logRun({ agent: "advisor-score", trigger: "nightly", status: "ok", summary: agent.slug, usage })
  return value
}

/** Recomputes every active advisor's score. The summary is rewritten only when the facts change. */
export async function computeAdvisorScores(onlySlug?: string) {
  if (!adminConfigured) return 0
  const supabase = adminClient()
  let query = supabase.from("agents").select("slug, name, languages, score").eq("active", true)
  if (onlySlug) query = query.eq("slug", onlySlug)
  const { data: agents } = await query
  let updated = 0
  for (const agent of (agents ?? []) as Agent[]) {
    const f = await factsFor(agent)
    // Public only with enough evidence: 5 meetings, or 3 verified reviews.
    const ready = f.meetings >= 5 || f.reviews >= 3
    const strengths = strengthsOf(f)
    const hash = createHash("sha1").update(JSON.stringify({ f, strengths })).digest("hex").slice(0, 12)
    let summary = agent.score?.hash === hash ? agent.score.summary : null
    if (ready && !summary && aiConfigured) {
      try {
        summary = await summarise(agent, { ...f, strengths })
      } catch (error) {
        await logRun({ agent: "advisor-score", trigger: "nightly", status: "error", summary: agent.slug, error: String(error) })
      }
    }
    const score: AdvisorScore = { ready, score: ready ? scoreOf(f) : null, ...f, strengths, summary, hash }
    await supabase.from("agents").update({ score, score_at: new Date().toISOString() }).eq("slug", agent.slug)
    updated++
  }
  return updated
}
