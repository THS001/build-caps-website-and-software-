import "server-only"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"
import { ingestDld, refreshCommunityStats, streamText } from "@/lib/market/dld"

/**
 * Market Intel (weekly): pull the latest DLD open data, refresh every
 * community's price per sq ft and 12-month change, then draft an insight post.
 * The post is saved unpublished; an editor reviews and publishes it.
 */
export async function runMarketIntel(trigger: "cron" | "admin") {
  if (!adminConfigured) return { skipped: "Supabase service role not configured" }
  const report: Record<string, unknown> = {}

  const url = process.env.DLD_TRANSACTIONS_CSV_URL
  if (url) {
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`)
      report.ingest = await ingestDld(streamText(res.body))
    } catch (error) {
      report.ingestError = error instanceof Error ? error.message : String(error)
    }
  }

  const updated = await refreshCommunityStats()
  report.communities = updated

  if (aiConfigured && updated.length) {
    try {
      const { value, usage } = await structured<{ title: string; excerpt: string; body: string }>({
        model: MODELS.deep,
        system: [
          "You are Buildcaps Research, writing a short weekly Dubai property market note for international investors.",
          "Use only the figures provided (DLD sales, median price per sq ft, 12-month change, number of sales). Name the source: Dubai Land Department open data.",
          "Plain English, 250–400 words, 4–6 short paragraphs separated by blank lines. No hype, no predictions stated as fact, no guaranteed returns. End with one line: 'Estimates for information only. Not financial advice.'",
        ].join("\n"),
        messages: [{ role: "user", content: JSON.stringify({ week_of: new Date().toISOString().slice(0, 10), communities: updated }) }],
        name: "insight_post",
        description: "The weekly market note",
        schema: {
          type: "object",
          properties: { title: { type: "string" }, excerpt: { type: "string", description: "One sentence" }, body: { type: "string" } },
          required: ["title", "excerpt", "body"],
        },
        maxTokens: 2000,
      })
      const slug = `dubai-market-week-${new Date().toISOString().slice(0, 10)}`
      await adminClient()
        .from("posts")
        .upsert({ slug, title: { en: value.title }, excerpt: { en: value.excerpt }, body: [{ en: value.body }], category: "market", author: "Buildcaps Research", minutes: 3, published: false }, { onConflict: "slug" })
      report.draftPost = slug
      await logRun({ agent: "market-intel", trigger, status: "ok", summary: `${updated.length} communities; draft ${slug}`, output: report, usage })
      return report
    } catch (error) {
      report.postError = error instanceof Error ? error.message : String(error)
    }
  }
  await logRun({ agent: "market-intel", trigger, status: report.ingestError || report.postError ? "error" : "ok", summary: `${updated.length} communities refreshed`, output: report })
  return report
}
