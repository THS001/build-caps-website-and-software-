// Translates Insights articles (title, excerpt, every body paragraph) into the
// other nine languages, straight into Supabase. Resumable: a language that is
// already present on an article is skipped, so it can be stopped and re-run.
//
//   node --env-file=.env.local scripts/translate-posts.mjs [--only=slug] [--locales=ar,ru] [--parallel=3]
//
// Native-speaker review is still required for ar, ur and fa before launch.

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const LANGS = { ar: "Arabic (Modern Standard, Gulf-friendly)", ru: "Russian", zh: "Simplified Chinese", hi: "Hindi", fr: "French", de: "German (formal Sie)", it: "Italian", ur: "Urdu", fa: "Persian (Farsi)" }
const GLOSSARY = ["Buildcaps", "DLD", "RERA", "Trakheesi", "Golden Visa", "Emaar", "DAMAC", "Sobha", "Nakheel", "Meraas", "Aldar", "Conrad Office Tower", "Sheikh Zayed Road", "WhatsApp"]
const MODEL = process.env.AI_MODEL_FAST ?? "claude-haiku-4-5-20251001"
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
const only = arg("only")
const targets = (arg("locales")?.split(",") ?? Object.keys(LANGS)).filter((l) => LANGS[l])
const parallel = Math.max(1, Math.min(4, Number(arg("parallel") ?? 3)))

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const claude = new Anthropic({ maxRetries: 4, timeout: 300_000 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const numbers = (s) => (s.match(/\d[\d.,]*/g) ?? []).map((n) => n.replace(/[.,]/g, "")).sort().join("|")

// Paragraphs go out in numbered chunks (p0, p1, …), so every one comes back in
// place and long articles never hit the output limit.
const CHUNK = 15

async function call(system, payload, schema) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await claude.messages.create({
        model: MODEL,
        max_tokens: 12_000,
        system,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
        output_config: { format: { type: "json_schema", schema } },
      })
      if (res.stop_reason === "max_tokens") throw new Error("cut off")
      return { value: JSON.parse(res.content.filter((b) => b.type === "text").map((b) => b.text).join("")), usage: res.usage }
    } catch (error) {
      // Out of credit or a bad request won't fix itself on retry.
      if (attempt === 3 || /credit balance|invalid_request/.test(String(error?.message))) throw error
      await sleep(attempt * 5000)
    }
  }
}

async function translate(post, locale) {
  const paragraphs = post.body.map((p) => p.en ?? "")
  const system = [
    `Translate this Buildcaps (Dubai real estate) article text into ${LANGS[locale]}. Natural and idiomatic, never word-for-word; keep the meaning, every number, date, price and percentage exactly.`,
    `Never translate these names; keep them in Latin script: ${GLOSSARY.join(", ")}, and any project, building, developer or company name.`,
    'Translate each field separately and return the same field names. A paragraph that starts with "## " is a heading: keep the "## " prefix. Keep Markdown links and bold markers as they are.',
  ].join("\n")
  const out = { title: "", excerpt: "", body: [] }
  let outputTokens = 0

  for (let from = 0; from === 0 || from < paragraphs.length; from += CHUNK) {
    const first = from === 0
    const keys = paragraphs.slice(from, from + CHUNK).map((_, i) => `p${from + i}`)
    const fields = [...(first ? ["title", "excerpt"] : []), ...keys]
    const schema = { type: "object", properties: Object.fromEntries(fields.map((k) => [k, { type: "string" }])), required: fields, additionalProperties: false }
    const payload = { ...(first ? { title: post.title.en, excerpt: post.excerpt.en } : {}), ...Object.fromEntries(keys.map((k) => [k, paragraphs[Number(k.slice(1))]])) }
    const { value, usage } = await call(system, payload, schema)
    outputTokens += usage.output_tokens
    if (first) Object.assign(out, { title: value.title, excerpt: value.excerpt })
    for (const k of keys) out.body.push(String(value[k] ?? ""))
  }

  if (out.body.some((p, i) => paragraphs[i] && !p)) throw new Error("a paragraph came back empty")
  const lostHeadings = paragraphs.filter((p, i) => p.startsWith("## ") && !out.body[i].startsWith("## ")).length
  if (lostHeadings) throw new Error(`${lostHeadings} headings lost their ## marker`)
  const warnings = []
  for (const term of GLOSSARY) if (paragraphs.join(" ").includes(term) && !out.body.join(" ").includes(term)) warnings.push(`"${term}" dropped`)
  if (!["ar", "fa", "ur", "hi", "zh"].includes(locale) && numbers(paragraphs.join(" ")) !== numbers(out.body.join(" "))) warnings.push("numbers differ")
  return { out, warnings, usage: { output_tokens: outputTokens } }
}

async function main() {
  let query = supabase.from("posts").select("slug, title, excerpt, body").order("slug")
  if (only) query = query.eq("slug", only)
  const { data: posts, error } = await query
  if (error) throw error
  const jobs = []
  for (const post of posts) for (const locale of targets) if (!post.title[locale]) jobs.push({ post, locale })
  console.log(`${jobs.length} article translations to do (${posts.length} articles × ${targets.length} languages, skipping ones already done)`)
  let done = 0
  let tokens = 0

  // A few at a time; each article's row is re-read before writing so parallel languages don't overwrite each other.
  const worker = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      const { post, locale } = job
      try {
        const { out, warnings, usage } = await translate(post, locale)
        tokens += usage.output_tokens
        const { data: fresh } = await supabase.from("posts").select("title, excerpt, body").eq("slug", post.slug).single()
        const body = fresh.body.map((p, i) => ({ ...p, [locale]: out.body[i] }))
        const { error: upErr } = await supabase.from("posts").update({ title: { ...fresh.title, [locale]: out.title }, excerpt: { ...fresh.excerpt, [locale]: out.excerpt }, body }).eq("slug", post.slug)
        if (upErr) throw upErr
        done++
        console.log(`✓ ${post.slug.slice(0, 48)} [${locale}]${warnings.length ? `  ⚠ ${warnings.join("; ")}` : ""}  (${done} done)`)
      } catch (e) {
        console.log(`✗ ${post.slug.slice(0, 48)} [${locale}]  ${e.message ?? e}`)
      }
    }
  }
  await Promise.all(Array.from({ length: parallel }, worker))
  console.log(`Finished: ${done} translations, ${tokens.toLocaleString("en")} output tokens. Review ar, ur and fa with a native speaker before launch.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
