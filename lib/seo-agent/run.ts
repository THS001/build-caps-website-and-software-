import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { locales, localeNames, type Locale } from "@/i18n/locales"
import { aiConfigured, claude, logRun, MODELS, structured, WEB_SEARCH_TOOL } from "@/lib/ai/client"
import { getCommunities, getPosts } from "@/lib/data"
import { sendEmail, teamInbox } from "@/lib/email/send"
import { renderEmail } from "@/lib/email/templates"
import { localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import sitemap from "@/app/sitemap"
import { applyProposal, rollbackProposal, type Proposal } from "./apply"
import { auditPage, type PageAudit } from "./crawl"
import { expectedCtr, gscConfigured, pageMetrics, queryMetrics, splitPage, type PageMetric, type QueryMetric } from "./gsc"

// SEO Growth Agent (weekly). Monitor (Search Console) → audit our pages →
// research who ranks (Claude web search + a robots.txt-respecting crawl) →
// propose changes → auto-apply low-risk ones in live mode (with snapshots) and
// queue content for approval → measure applied changes and roll back losers →
// email the team a report. SEO_AGENT_MODE=dry_run (default) only proposes.

export const seoMode: "dry_run" | "live" = process.env.SEO_AGENT_MODE === "live" ? "live" : "dry_run"
const LOCALES = (process.env.SEO_AGENT_LOCALES ?? "en,ar,ru,zh").split(",").map((l) => l.trim()).filter((l): l is Locale => (locales as readonly string[]).includes(l))
const MAX_PAGES = Number(process.env.SEO_AGENT_MAX_PAGES ?? 8)
const MAX_AUTO_APPLY = 5
const BASE = process.env.SEO_AGENT_BASE_URL ?? site.url
const DAY = 86_400_000

/** Pages we always watch, with seed keywords (Claude localises them for each market). */
const SEEDS: Record<string, string[]> = {
  "/": ["Dubai real estate agency", "buy property in Dubai"],
  "/off-plan": ["off-plan property Dubai", "new project launches Dubai"],
  "/invest": ["invest in Dubai property", "Dubai rental yield"],
  "/tools/golden-visa": ["Dubai golden visa through property"],
  "/communities": ["best areas to buy property in Dubai"],
  "/properties": ["apartments for sale in Dubai"],
  "/tools/mortgage": ["Dubai mortgage for non-residents"],
  "/tools/estimate": ["Dubai property valuation online"],
}

type Target = { locale: Locale; pathname: string; keywords: string[]; metric: PageMetric | null; audit: PageAudit | null; url: string }
type Finding = { keyword: string; locale: Locale; results: { url: string; title: string; covers: string }[] }
type Draft = { locale: string; pathname: string; kind: Proposal["kind"]; proposed: Record<string, unknown>; rationale: string; evidence: string }

const RERA_BLOCKLIST = /\bguarantee(d)?\b|risk[- ]free|assured returns?|\bno\.?\s?1\b|number one|best returns|100% safe/i

export async function runSeoAgent({ mode = seoMode, trigger }: { mode?: "dry_run" | "live"; trigger: string }) {
  if (!adminConfigured) return { status: "skipped", reason: "SUPABASE_SERVICE_ROLE_KEY is not set" }
  const supabase = adminClient()
  const { data: run } = await supabase.from("seo_runs").insert({ mode }).select("id").single()
  const report: Record<string, unknown> = { mode, trigger, gsc: gscConfigured, ai: aiConfigured }

  try {
    // 1. Monitor: last 28 days of Search Console (data lags about two days).
    const end = new Date(Date.now() - 2 * DAY)
    const start = new Date(end.getTime() - 28 * DAY)
    let pages: PageMetric[] = []
    let queries: QueryMetric[] = []
    if (gscConfigured) {
      ;[pages, queries] = await Promise.all([pageMetrics(start, end), queryMetrics(start, end)])
      const top = (page: string) => queries.filter((q) => q.page === page).sort((a, b) => b.impressions - a.impressions).slice(0, 10)
      const rows = pages.map((p) => ({ page: p.page, period_end: end.toISOString().slice(0, 10), clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position, queries: top(p.page) }))
      for (let i = 0; i < rows.length; i += 500) await supabase.from("seo_metrics").upsert(rows.slice(i, i + 500), { onConflict: "page,period_end" })
      report.pages = pages.length
      // 2. Measure what we changed before; roll back losers, keep winners.
      report.measured = await measureApplied(end)
    }

    // 3. Pick pages: weak CTR for their position (Search Console), else our key pages.
    const allowed = await allowedPaths()
    const targets = pickTargets(pages, queries, allowed)
    await Promise.all(targets.map(async (t) => (t.audit = await auditPage(t.url))))
    report.targets = targets.map((t) => `${t.locale}${t.pathname}`)

    if (!aiConfigured) {
      report.note = "ANTHROPIC_API_KEY not set: monitoring only, no proposals."
      return await finish(run?.id, "ok", report, [])
    }

    // 4. Who ranks, and what they cover.
    const findings = await research(targets)
    const competitorAudits = await crawlCompetitors(findings)
    report.competitorsChecked = competitorAudits.length

    // 5. Analyse and propose.
    const drafts = await propose(targets, findings, competitorAudits, allowed)
    const valid = drafts.filter((d) => validate(d, allowed, competitorAudits))
    report.proposed = drafts.length
    report.rejectedByGuardrails = drafts.length - valid.length

    const recent = await recentlyChanged()
    const inserted: Proposal[] = []
    for (const d of valid) {
      const target = targets.find((t) => t.locale === d.locale && t.pathname === d.pathname)
      const risk = d.kind === "meta" || d.kind === "internal_links" ? "low" : "content"
      const { data } = await supabase
        .from("seo_proposals")
        .insert({
          run_id: run?.id,
          locale: d.locale,
          pathname: d.pathname,
          kind: d.kind,
          risk,
          current: target?.audit ? { title: target.audit.title, description: target.audit.description } : null,
          proposed: d.proposed,
          rationale: d.rationale,
          evidence: { note: d.evidence, keywords: target?.keywords ?? [] },
          baseline: target?.metric ?? null,
        })
        .select("*")
        .single()
      if (data) inserted.push(data as Proposal)
    }

    // 6. Live mode: low-risk changes go out now (one change per page at a time, so results can be measured).
    let applied = 0
    if (mode === "live") {
      for (const p of inserted) {
        if (p.risk !== "low" || applied >= MAX_AUTO_APPLY || recent.has(`${p.locale}${p.pathname}`)) continue
        await applyProposal(p)
        recent.add(`${p.locale}${p.pathname}`)
        applied++
      }
    }
    report.autoApplied = applied
    report.awaitingApproval = inserted.filter((p) => p.risk === "content").length
    return await finish(run?.id, "ok", report, inserted)
  } catch (error) {
    report.error = String(error)
    return await finish(run?.id, "error", report, [])
  }
}

async function finish(runId: string | undefined, status: "ok" | "error", report: Record<string, unknown>, proposals: Proposal[]) {
  const supabase = adminClient()
  const summary =
    status === "error"
      ? `Failed: ${report.error}`
      : `${proposals.length} proposals (${report.autoApplied ?? 0} applied automatically, ${report.awaitingApproval ?? 0} awaiting approval).`
  if (runId) await supabase.from("seo_runs").update({ status, summary, report }).eq("id", runId)
  await logRun({ agent: "seo-growth", trigger: String(report.trigger), status: status === "ok" ? "ok" : "error", summary, error: status === "error" ? String(report.error) : undefined })
  if (report.trigger === "cron") await emailReport(summary, report, proposals)
  return { status, summary, report }
}

async function allowedPaths() {
  const entries = await sitemap()
  const set = new Set<string>()
  for (const e of entries) {
    const s = splitPage(e.url)
    if (s) set.add(s.pathname === "/" ? "/" : s.pathname.replace(/\/$/, ""))
  }
  return set
}

function pickTargets(pages: PageMetric[], queries: QueryMetric[], allowed: Set<string>): Target[] {
  const out: Target[] = []
  if (pages.length) {
    const scored = pages
      .filter((p) => p.impressions >= 50)
      .map((p) => ({ p, gap: p.impressions * Math.max(0, expectedCtr(p.position) - p.ctr) }))
      .sort((a, b) => b.gap - a.gap)
    for (const { p } of scored) {
      const s = splitPage(p.page)
      if (!s || !allowed.has(s.pathname) || out.length >= MAX_PAGES) continue
      const keywords = queries.filter((q) => q.page === p.page).sort((a, b) => b.impressions - a.impressions).slice(0, 3).map((q) => q.query)
      out.push({ ...s, keywords: keywords.length ? keywords : SEEDS[s.pathname] ?? [], metric: p, audit: null, url: p.page })
    }
  }
  for (const locale of LOCALES) {
    for (const [pathname, keywords] of Object.entries(SEEDS)) {
      if (out.length >= MAX_PAGES) break
      if (out.some((t) => t.locale === locale && t.pathname === pathname)) continue
      out.push({ locale, pathname, keywords, metric: null, audit: null, url: new URL(localizedPath(pathname, locale), BASE).toString() })
    }
  }
  return out.slice(0, MAX_PAGES)
}

/** Claude searches each market in its own language and records who ranks (never our own site). */
async function research(targets: Target[]): Promise<Finding[]> {
  const findings: Finding[] = []
  const byLocale = new Map<Locale, string[]>()
  for (const t of targets) byLocale.set(t.locale, [...new Set([...(byLocale.get(t.locale) ?? []), ...t.keywords.slice(0, 2)])].slice(0, 4))
  const recordTool: Anthropic.Tool = {
    name: "record_results",
    description: "Record the top organic results for each keyword",
    input_schema: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              results: { type: "array", items: { type: "object", properties: { url: { type: "string" }, title: { type: "string" }, covers: { type: "string" } }, required: ["url", "title", "covers"] } },
            },
            required: ["keyword", "results"],
          },
        },
      },
      required: ["keywords"],
    },
  }

  for (const [locale, keywords] of byLocale) {
    const system = `You research search results for Dubai real estate keywords for people searching in ${localeNames[locale]}. Translate each keyword naturally into that language, search the web for it, and record the top five organic results that are not buildcaps.com: URL, page title, and one line on what the page covers (topics, tools, FAQs). Then call record_results.`
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: JSON.stringify({ keywords }) }]
    try {
      let response = await claude().messages.create({ model: MODELS.chat, max_tokens: 4000, system, messages, tools: [WEB_SEARCH_TOOL, recordTool] })
      for (let i = 0; i < 3 && response.stop_reason === "pause_turn"; i++) {
        messages.push({ role: "assistant", content: response.content })
        response = await claude().messages.create({ model: MODELS.chat, max_tokens: 4000, system, messages, tools: [WEB_SEARCH_TOOL, recordTool] })
      }
      const call = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "record_results")
      let input = call?.input as { keywords: { keyword: string; results: Finding["results"] }[] } | undefined
      if (!input) {
        // No tool call: turn the written findings (text plus cited pages) into the same shape.
        const notes = response.content
          .map((b) => (b.type === "text" ? [b.text, ...(b.citations ?? []).map((c) => ("url" in c ? `[${c.title ?? ""}](${c.url})` : ""))].join("\n") : ""))
          .join("\n")
          .slice(0, 30_000)
        const { value } = await structured<{ keywords: { keyword: string; results: Finding["results"] }[] }>({
          model: MODELS.fast,
          system: "Extract the search results described in these research notes. Only include pages that are mentioned with a URL.",
          messages: [{ role: "user", content: notes || "No notes." }],
          name: "record_results",
          description: "Top organic results for each keyword",
          schema: recordTool.input_schema,
          maxTokens: 3000,
        })
        input = value
      }
      for (const k of input.keywords ?? []) findings.push({ keyword: k.keyword, locale, results: (k.results ?? []).filter((r) => !/buildcaps\.com/i.test(r.url)).slice(0, 5) })
    } catch (error) {
      await logRun({ agent: "seo-growth", trigger: `research:${locale}`, status: "error", error: String(error) })
    }
  }
  return findings
}

async function crawlCompetitors(findings: Finding[]) {
  const urls = [...new Set(findings.flatMap((f) => f.results.slice(0, 2).map((r) => r.url)))].slice(0, 12)
  const audits: PageAudit[] = []
  for (const url of urls) {
    const a = await auditPage(url)
    if (a) audits.push(a)
  }
  return audits
}

async function propose(targets: Target[], findings: Finding[], competitors: PageAudit[], allowed: Set<string>): Promise<Draft[]> {
  const [communities, posts] = await Promise.all([getCommunities(), getPosts()])
  const facts = {
    company: { name: site.name, url: site.url, office: "Conrad Office Tower, Sheikh Zayed Road, Dubai", languages: locales.map((l) => localeNames[l]) },
    communitiesCovered: communities.map((c) => c.name),
    existingArticles: posts.map((p) => p.title.en),
    tools: ["ROI, mortgage, payment-plan, buying-cost, Golden Visa and currency calculators", "Buildcaps Estimate (DLD comparables)", "Dubai Data Room", "Match Me quiz", "Wealth Twin", "Regret Radar", "Portfolio Architect", "Day in Your Life", "Family Decision Room", "Promise Ledger", "Handover Truth Score", "Ghost Tenant Market", "Future Skyline View"],
  }
  const { value, usage } = await structured<{ proposals: Draft[] }>({
    model: MODELS.chat,
    maxTokens: 10_000,
    think: true,
    system: [
      "You are the SEO Growth Agent for Buildcaps Real Estate, a Dubai brokerage. Propose improvements to OUR pages only.",
      "Kinds you may propose:",
      "- meta: { title, description }. Title at most 45 characters (the site appends ' | Buildcaps Real Estate'); description 120 to 155 characters. Written in the page's language.",
      "- internal_links: { links: [{ href, label }] } with 2 to 5 links to our existing paths (from allowedPaths, without a language prefix) and labels in the page's language.",
      "- faq: { faq: [{ q, a }] } with 3 to 5 questions searchers ask, answers under 60 words, in the page's language, using only the facts provided.",
      "- new_page: { slug, title, excerpt, body: [paragraphs], category } — an English article draft (5 to 8 paragraphs; category one of market, guides, offPlan, communities, news) only for a topic competitors cover and we don't.",
      "Rules: never copy or closely paraphrase competitor text; competitors only show gaps. Never invent statistics, prices or claims. Follow Dubai RERA advertising rules: no guaranteed or risk-free returns, no unproven superlatives ('best', 'No. 1'), prices in AED. At most two proposals per page.",
      "For each proposal give a one-sentence rationale and the evidence (query, CTR gap or competitor gap), both in English for our team.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          facts,
          allowedPaths: [...allowed].slice(0, 400),
          targets: targets.map((t) => ({ locale: t.locale, language: localeNames[t.locale], pathname: t.pathname, keywords: t.keywords, searchConsole: t.metric, currentPage: t.audit && { title: t.audit.title, description: t.audit.description, h1: t.audit.h1, h2: t.audit.h2.slice(0, 12), words: t.audit.words, schema: t.audit.schemaTypes, faqCount: t.audit.faqCount } })),
          competitors: findings,
          competitorPages: competitors.map((c) => ({ url: c.url, titleLength: c.title?.length ?? 0, h2: c.h2.slice(0, 12), words: c.words, schema: c.schemaTypes, faqCount: c.faqCount })),
        }).slice(0, 120_000),
      },
    ],
    name: "submit_proposals",
    description: "Submit the SEO proposals",
    schema: {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locale: { type: "string", enum: [...locales] },
              pathname: { type: "string" },
              kind: { type: "string", enum: ["meta", "internal_links", "faq", "new_page"] },
              proposed: {
                type: "object",
                description: "Only the fields for this kind: meta → title, description; internal_links → links; faq → faq; new_page → slug, title, excerpt, body, category",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  links: { type: "array", items: { type: "object", properties: { href: { type: "string" }, label: { type: "string" } }, required: ["href", "label"] } },
                  faq: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] } },
                  slug: { type: "string" },
                  excerpt: { type: "string" },
                  body: { type: "array", items: { type: "string" } },
                  category: { type: "string", enum: ["market", "guides", "offPlan", "communities", "news"] },
                },
              },
              rationale: { type: "string" },
              evidence: { type: "string" },
            },
            required: ["locale", "pathname", "kind", "proposed", "rationale", "evidence"],
          },
        },
      },
      required: ["proposals"],
    },
  })
  await logRun({ agent: "seo-growth", trigger: "analyse", status: "ok", summary: `${value.proposals?.length ?? 0} drafts`, usage })
  return value.proposals ?? []
}

const shingles = (s: string, n = 8) => {
  const w = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "))
  return out
}

/** Guardrails: our paths only, sane lengths, RERA wording, and no text lifted from competitors. */
function validate(d: Draft, allowed: Set<string>, competitors: PageAudit[]) {
  if (!(locales as readonly string[]).includes(d.locale) || (d.kind !== "new_page" && !allowed.has(d.pathname))) return false
  const p = d.proposed as Record<string, unknown>
  const strings = JSON.stringify(p)
  if (RERA_BLOCKLIST.test(strings)) return false
  const theirs = new Set(competitors.flatMap((c) => [...shingles([c.title ?? "", c.description ?? "", ...c.h2].join(" "))]))
  for (const s of shingles(strings)) if (theirs.has(s)) return false
  switch (d.kind) {
    case "meta": {
      const title = String(p.title ?? "")
      const description = String(p.description ?? "")
      return title.length >= 10 && title.length <= 60 && description.length >= 50 && description.length <= 170
    }
    case "internal_links": {
      const links = p.links as { href?: string; label?: string }[] | undefined
      return Array.isArray(links) && links.length >= 2 && links.length <= 6 && links.every((l) => typeof l.href === "string" && allowed.has(l.href) && typeof l.label === "string" && l.label.length <= 60)
    }
    case "faq": {
      const faq = p.faq as { q?: string; a?: string }[] | undefined
      return Array.isArray(faq) && faq.length >= 2 && faq.length <= 6 && faq.every((f) => typeof f.q === "string" && typeof f.a === "string" && f.q.length <= 160 && f.a.length <= 700)
    }
    case "new_page": {
      const body = p.body as unknown[] | undefined
      return typeof p.slug === "string" && /^[a-z0-9-]{3,80}$/.test(p.slug) && typeof p.title === "string" && Array.isArray(body) && body.length >= 3 && body.length <= 12
    }
    default:
      return false
  }
}

async function recentlyChanged() {
  const { data } = await adminClient().from("seo_proposals").select("locale, pathname").eq("status", "applied").gte("applied_at", new Date(Date.now() - 28 * DAY).toISOString())
  return new Set((data ?? []).map((r) => `${r.locale}${r.pathname}`))
}

/** 14–28 days after a change: roll back clear losers, keep the rest. */
async function measureApplied(end: Date) {
  const supabase = adminClient()
  const { data } = await supabase.from("seo_proposals").select("*").eq("status", "applied").neq("kind", "new_page").lte("applied_at", new Date(Date.now() - 14 * DAY).toISOString())
  let kept = 0
  let rolledBack = 0
  for (const p of data ?? []) {
    const url = new URL(localizedPath(p.pathname, p.locale as Locale), site.url).toString()
    const appliedAt = new Date(p.applied_at)
    const days = Math.max(1, (end.getTime() - appliedAt.getTime()) / DAY)
    const after = (await pageMetrics(appliedAt, end, url))[0]
    const before = p.baseline as PageMetric | null
    if (!after || !before) {
      if (days >= 28) {
        await supabase.from("seo_proposals").update({ status: "kept", result: { note: "No Search Console data to compare" } }).eq("id", p.id)
        kept++
      }
      continue
    }
    const result = { before, after, days: Math.round(days) }
    const ctrDrop = before.ctr > 0 ? (after.ctr - before.ctr) / before.ctr : 0
    const clicksDrop = after.clicks / days < before.clicks / 28
    if (after.impressions >= 30 && ctrDrop < -0.15 && clicksDrop) {
      await rollbackProposal(p.id, result)
      rolledBack++
    } else if (days >= 28) {
      await supabase.from("seo_proposals").update({ status: "kept", result }).eq("id", p.id)
      kept++
    }
  }
  return { kept, rolledBack }
}

async function emailReport(summary: string, report: Record<string, unknown>, proposals: Proposal[]) {
  const admin = new URL("/admin/seo", site.url).toString()
  const { html, text } = await renderEmail({
    locale: "en",
    preheader: summary,
    heading: "SEO Growth Agent: weekly report",
    paragraphs: [
      summary,
      report.mode === "dry_run" ? "Dry-run mode: nothing was published. Review the proposals in the admin." : "Live mode: low-risk changes were applied with a snapshot and will be measured over 14 to 28 days.",
      ...(report.note ? [String(report.note)] : []),
    ],
    details: [
      { label: "Pages analysed", value: String((report.targets as string[] | undefined)?.length ?? 0) },
      { label: "Competitor pages checked", value: String(report.competitorsChecked ?? 0) },
      { label: "Measured changes", value: JSON.stringify(report.measured ?? "n/a") },
      ...proposals.slice(0, 8).map((p) => ({ label: `${p.kind} · ${p.locale}${p.pathname}`, value: p.risk === "low" ? "low risk" : "needs approval" })),
    ],
    cta: { label: "Open the SEO queue", href: admin },
  })
  await sendEmail({ to: teamInbox, subject: `SEO agent: ${summary}`, html, text })
}
