import "server-only"
import { createHash } from "node:crypto"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"
import { localeNames, locales, type Locale } from "@/i18n/locales"

// Translation QA: when content is published, each translation is compared with
// the English (back-translation in the model's head), numbers and dates are
// checked, and brand names must stay as written. It only flags; an editor fixes
// the text in the admin and resolves the flag.

export type QaTable = "properties" | "posts" | "communities" | "developers" | "projects" | "reports" | "jobs" | "funnels"

/** Translated fields per table, and the key used for admin links (id or slug). */
export const QA_TABLES: Record<QaTable, { key: "id" | "slug"; label: string; fields: string[] }> = {
  properties: { key: "id", label: "title", fields: ["title", "description"] },
  posts: { key: "slug", label: "title", fields: ["title", "excerpt", "body"] },
  communities: { key: "slug", label: "name", fields: ["summary", "lifestyle", "schools", "transport"] },
  developers: { key: "slug", label: "name", fields: ["summary"] },
  projects: { key: "slug", label: "name", fields: ["summary"] },
  reports: { key: "slug", label: "title", fields: ["title", "summary"] },
  jobs: { key: "slug", label: "title", fields: ["title", "type", "summary"] },
  funnels: { key: "id", label: "title", fields: ["title", "pitch", "tag"] },
}

type Issue = { field: string; severity: "high" | "medium" | "low"; issue: string; suggestion: string | null }
type Localized = Partial<Record<Locale, string>>

/** Field → text per language. Article bodies (lists of paragraphs) are joined. */
function textsOf(row: Record<string, unknown>, fields: string[]) {
  const out: Record<string, Localized> = {}
  for (const f of fields) {
    const v = row[f]
    if (Array.isArray(v)) {
      const joined: Localized = {}
      for (const l of locales) {
        const parts = (v as Localized[]).map((p) => p?.[l]).filter(Boolean)
        if (parts.length) joined[l] = parts.join("\n\n")
      }
      out[f] = joined
    } else if (v && typeof v === "object") out[f] = v as Localized
  }
  return out
}

async function glossary() {
  const supabase = adminClient()
  const [{ data: devs }, { data: projects }] = await Promise.all([supabase.from("developers").select("name"), supabase.from("projects").select("name")])
  return ["Buildcaps", "Buildcaps Real Estate", ...(devs ?? []).map((d) => d.name), ...(projects ?? []).map((p) => p.name)]
}

const issueSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          issue: { type: "string", description: "What is wrong, in English, one sentence" },
          suggestion: { type: ["string", "null"], description: "Corrected wording in the target language, or null" },
        },
        required: ["field", "severity", "issue", "suggestion"],
      },
    },
  },
  required: ["issues"],
} as const

/** Checks one published item's translations and replaces its open flags. Returns the number of flags, or null if skipped. */
export async function runTranslationQa(table: QaTable, key: string, opts: { force?: boolean } = {}) {
  if (!adminConfigured || !aiConfigured) return null
  const spec = QA_TABLES[table]
  const supabase = adminClient()
  const { data: row } = await supabase.from(table).select(`${spec.key}, ${spec.fields.join(", ")}`).eq(spec.key, key).maybeSingle()
  if (!row) return null
  const texts = textsOf(row as unknown as Record<string, unknown>, spec.fields)
  const targets = locales.filter((l) => l !== "en" && Object.values(texts).some((t) => t[l]))
  const hash = createHash("sha1").update(JSON.stringify(texts)).digest("hex").slice(0, 16)
  const runKey = `${table}:${key}`

  if (!opts.force) {
    const { data: last } = await supabase.from("agent_runs").select("output").eq("agent", "translation-qa").eq("summary", runKey).eq("status", "ok").order("created_at", { ascending: false }).limit(1)
    if ((last?.[0]?.output as { hash?: string } | null)?.hash === hash) return null
  }

  const names = await glossary()
  const flags: (Issue & { locale: Locale })[] = []
  let tokens = { input_tokens: 0, output_tokens: 0 }
  for (const locale of targets) {
    const pairs = Object.fromEntries(Object.entries(texts).filter(([, t]) => t.en && t[locale]).map(([f, t]) => [f, { english: t.en!.slice(0, 6000), translation: t[locale]!.slice(0, 6000) }]))
    if (!Object.keys(pairs).length) continue
    try {
      const { value, usage } = await structured<{ issues: Issue[] }>({
        model: MODELS.fast,
        system: [
          `You review ${localeNames[locale]} translations for Buildcaps, a Dubai real estate website. For each field, compare the translation with the English source as a back-translation would.`,
          "Flag only real problems: meaning changed, added or missing; numbers, prices, percentages, dates or units that differ; text left in English or in the wrong language; Markdown headings ('## ') lost.",
          `These names must stay exactly as written (Latin script), never translated: ${names.join(", ")}. Community and area names may stay in Latin script or be transliterated; both are fine. The currency may be written as AED or in the local word for dirham.`,
          locale === "ar" || locale === "ur" || locale === "fa" ? "This is a right-to-left language: also flag sentences that would display wrongly because of stray Latin punctuation or mixed scripts." : "",
          "Do not flag style preferences. Severity: high = wrong facts or meaning; medium = omission, glossary or wrong-language text; low = awkward but correct. Return an empty list when the translation is good.",
        ]
          .filter(Boolean)
          .join(" "),
        messages: [{ role: "user", content: JSON.stringify(pairs) }],
        name: "translation_issues",
        description: "The issues found",
        schema: issueSchema as never,
        maxTokens: 2500,
      })
      tokens = { input_tokens: tokens.input_tokens + usage.input_tokens, output_tokens: tokens.output_tokens + usage.output_tokens }
      for (const i of (value.issues ?? []).slice(0, 10)) if (spec.fields.includes(i.field)) flags.push({ ...i, locale })
    } catch (error) {
      await logRun({ agent: "translation-qa", trigger: "publish", status: "error", summary: runKey, error: String(error) })
      return null
    }
  }

  await supabase.from("translation_flags").delete().eq("table_name", table).eq("row_key", key).is("resolved_at", null)
  if (flags.length) {
    await supabase.from("translation_flags").insert(
      flags.map((f) => ({ table_name: table, row_key: key, locale: f.locale, field: f.field, severity: f.severity, issue: f.issue.slice(0, 1000), suggestion: f.suggestion?.slice(0, 4000) ?? null })),
    )
  }
  await logRun({ agent: "translation-qa", trigger: "publish", status: "ok", summary: runKey, output: { hash, locales: targets, flags: flags.length }, usage: tokens })
  return flags.length
}

/** Checks published items not yet checked in their current wording, within a time budget. */
export async function runTranslationQaAll(budgetMs = 240_000) {
  if (!adminConfigured || !aiConfigured) return 0
  const started = Date.now()
  const supabase = adminClient()
  let checked = 0
  for (const table of Object.keys(QA_TABLES) as QaTable[]) {
    const spec = QA_TABLES[table]
    const visible = table === "funnels" ? "active" : "published"
    const { data } = await supabase.from(table).select(spec.key).eq(visible, true).limit(200)
    for (const r of (data ?? []) as unknown as Record<string, string>[]) {
      if (Date.now() - started > budgetMs) return checked
      if ((await runTranslationQa(table, r[spec.key])) !== null) checked++
    }
  }
  return checked
}
