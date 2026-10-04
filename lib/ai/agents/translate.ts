import "server-only"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"

// Translation drafts for admin content (listings, opportunities, posts) plus the
// Translation QA checks. Native-speaker review is still required for AR, UR and FA.

export const GLOSSARY = [
  "Buildcaps",
  "DLD",
  "RERA",
  "Trakheesi",
  "AED",
  "Golden Visa",
  "Emaar",
  "DAMAC",
  "Sobha",
  "BNW",
  "Conrad Office Tower",
  "Sheikh Zayed Road",
  "WhatsApp",
]

const LANGUAGE_NOTES: Partial<Record<Locale, string>> = {
  ar: "Modern Standard Arabic, Gulf-friendly",
  de: "formal Sie",
  zh: "Simplified Chinese",
  fa: "Persian (Farsi)",
}

export type TranslationResult = { values: Partial<Record<Locale, Record<string, string>>>; warnings: string[] }

/**
 * Translates English fields into the requested languages. `keep` lists extra
 * proper nouns (project and developer names) that must stay untranslated.
 */
export async function translateFields(fields: Record<string, string>, targets: Locale[], keep: string[] = []): Promise<TranslationResult> {
  if (!aiConfigured) throw new Error("AI translation needs ANTHROPIC_API_KEY")
  const wanted = targets.filter((l) => l !== "en" && (locales as readonly string[]).includes(l))
  const glossary = [...GLOSSARY, ...keep]
  const { value, usage } = await structured<Record<string, Record<string, string>>>({
    model: MODELS.fast,
    system: [
      "You translate Dubai real estate copy for Buildcaps. Natural, idiomatic, precise; never word-for-word; keep the meaning and every number exactly.",
      `Never translate these names: ${glossary.join(", ")}. Keep project and developer names in Latin script.`,
      `Target languages: ${wanted.map((l) => `${l} (${localeNames[l]}${LANGUAGE_NOTES[l] ? `, ${LANGUAGE_NOTES[l]}` : ""})`).join("; ")}.`,
    ].join("\n"),
    messages: [{ role: "user", content: JSON.stringify(fields) }],
    name: "translations",
    description: "Translations keyed by language code, then by field name",
    schema: {
      type: "object",
      properties: Object.fromEntries(
        wanted.map((l) => [l, { type: "object", properties: Object.fromEntries(Object.keys(fields).map((f) => [f, { type: "string" }])), required: Object.keys(fields) }]),
      ),
      required: wanted,
    },
    maxTokens: 8000,
  })

  // Translation QA: names, numbers and length sanity.
  const warnings: string[] = []
  const numbers = (s: string) => (s.match(/\d[\d.,]*/g) ?? []).map((n) => n.replace(/[.,]/g, "")).sort().join("|")
  for (const l of wanted) {
    for (const [field, source] of Object.entries(fields)) {
      const out = value[l]?.[field] ?? ""
      if (!out) warnings.push(`${l}.${field}: missing`)
      for (const term of glossary) if (source.includes(term) && !out.includes(term)) warnings.push(`${l}.${field}: "${term}" was translated or dropped`)
      if (numbers(source) !== numbers(out.replace(/[٠-٩۰-۹]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "۰۱۲۳۴۵۶۷۸۹".indexOf(d)))))
        warnings.push(`${l}.${field}: numbers differ from the English`)
      if (out.length > source.length * 3 + 40) warnings.push(`${l}.${field}: unusually long`)
    }
  }
  await logRun({ agent: "translation", trigger: "admin", status: "ok", summary: `${Object.keys(fields).join(", ")} → ${wanted.join(", ")}`, output: { warnings }, usage })
  return { values: value as TranslationResult["values"], warnings }
}
