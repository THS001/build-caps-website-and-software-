#!/usr/bin/env node
// Translates messages/en.json into every other locale with Claude.
//
//   ANTHROPIC_API_KEY=... node scripts/translate-messages.mjs [--locales ar,ur] [--force]
//
// Only keys that are missing, or whose English source changed since the last run,
// are sent. Hand-reviewed translations are therefore kept unless --force is passed.
// Run state (a hash of the English source per key) lives in scripts/.translation-state.json,
// outside messages/ so the site never bundles it.

import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const MODEL = "claude-sonnet-5-5"
const BATCH_SIZE = 60
const DIR = join(process.cwd(), "messages")
const STATE_FILE = join(process.cwd(), "scripts", ".translation-state.json")

const LANGUAGES = {
  ar: "Arabic (Modern Standard, Gulf-friendly)",
  ru: "Russian",
  zh: "Simplified Chinese",
  hi: "Hindi",
  fr: "French",
  de: "German (formal Sie)",
  it: "Italian",
  ur: "Urdu",
  fa: "Persian (Farsi)",
}

const GLOSSARY = [
  "Buildcaps",
  "Buildcaps Estimate",
  "Ask Buildcaps",
  "DLD",
  "RERA",
  "Trakheesi",
  "ORN",
  "BRN",
  "AED",
  "Emaar",
  "DAMAC",
  "Sobha",
  "BNW",
  "Conrad Office Tower",
  "Sheikh Zayed Road",
  "WhatsApp",
  "Google Meet",
]

const args = process.argv.slice(2)
const force = args.includes("--force")
const localeArg = args[args.indexOf("--locales") + 1]
const targets = args.includes("--locales") ? localeArg.split(",") : Object.keys(LANGUAGES)

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set.")
  process.exit(1)
}

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12)
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback)

function flatten(node, prefix = "", out = {}) {
  if (typeof node === "string") out[prefix] = node
  else for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  return out
}

// Rebuilds the tree in English key order. Arrays are always written whole
// (falling back to English per item) because locale arrays replace English ones.
function build(enNode, flat, prefix = "") {
  if (typeof enNode === "string") return flat[prefix]
  if (Array.isArray(enNode)) {
    const items = enNode.map((item, i) => build(item, flat, `${prefix}.${i}`))
    if (items.every((item) => item === undefined)) return undefined
    return enNode.map((item, i) => items[i] ?? fillWithEnglish(item, flat, `${prefix}.${i}`))
  }
  const out = {}
  for (const [k, v] of Object.entries(enNode)) {
    const value = build(v, flat, prefix ? `${prefix}.${k}` : k)
    if (value !== undefined) out[k] = value
  }
  return Object.keys(out).length ? out : undefined
}

function fillWithEnglish(enNode, flat, prefix) {
  if (typeof enNode === "string") return flat[prefix] ?? enNode
  if (Array.isArray(enNode)) return enNode.map((item, i) => fillWithEnglish(item, flat, `${prefix}.${i}`))
  return Object.fromEntries(
    Object.entries(enNode).map(([k, v]) => [k, fillWithEnglish(v, flat, `${prefix}.${k}`)]),
  )
}

// ICU argument names must survive translation unchanged.
// Argument names ({count}, {count, plural, …}) plus the number of plural/select
// blocks. Branch text such as "=0 {Studio}" is not an argument, and languages may
// add plural categories (few, many), so those are not compared.
const placeholders = (s) =>
  [...s.matchAll(/\{\s*([a-z][A-Za-z0-9_]*)\s*(?=[,}])/g)].map((m) => m[1]).sort().join(",") + "|" + (s.match(/\b(plural|select|selectordinal)\b/g) ?? []).length

/** The first complete JSON object in a reply, ignoring any text around it. */
function firstJsonObject(text) {
  const start = text.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === "\\") i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === "{") depth++
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

async function translateBatch(language, entries, retries = 2) {
  const system = [
    `You translate website copy for Buildcaps, a Dubai real estate investment consultancy, from English into ${language}.`,
    "Voice: precise, calm, confident, warm; like a private banker. Natural, idiomatic phrasing, never word-for-word.",
    "Keep ICU MessageFormat syntax exactly: {placeholders}, plural/select keywords (plural, one, other, =0), and '#' stay as-is; translate only the human text inside branches.",
    `Never translate these terms: ${GLOSSARY.join(", ")}. Keep project and developer names in Latin script.`,
    "Keep numbers, currency codes and units as in the source unless the language conventionally localises digits in prose.",
    "Return ONLY a JSON object mapping each input key to its translation. No commentary.",
  ].join("\n")

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: JSON.stringify(Object.fromEntries(entries), null, 1) }],
  })
  // Rate limits (429) and overload (529, 5xx) are retried with backoff, honouring retry-after.
  let res
  for (let attempt = 0; ; attempt++) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body,
    })
    if (res.ok || attempt >= 8 || !(res.status === 429 || res.status >= 500)) break
    const wait = Number(res.headers.get("retry-after")) * 1000 || Math.min(60_000, 2_000 * 2 ** attempt)
    console.log(`  ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const text = data.content.map((c) => c.text ?? "").join("")
  const json = firstJsonObject(text)
  if (!json) {
    if (retries > 0) return translateBatch(language, entries, retries - 1)
    console.warn(`  ! unreadable reply for ${entries.length} strings, left for the next run`)
    return {}
  }

  const accepted = {}
  for (const [key, source] of entries) {
    const translated = json[key]
    if (typeof translated !== "string") console.warn(`  ! missing ${key}`)
    else if (placeholders(translated) !== placeholders(source)) console.warn(`  ! placeholder mismatch in ${key}, kept English`)
    else accepted[key] = translated
  }
  return accepted
}

const en = readJson(join(DIR, "en.json"))
const enFlat = flatten(en)
const state = readJson(STATE_FILE, {})

for (const locale of targets) {
  const language = LANGUAGES[locale]
  if (!language) {
    console.warn(`Skipping unknown locale "${locale}"`)
    continue
  }

  const file = join(DIR, `${locale}.json`)
  const current = flatten(readJson(file, {}))
  const localeState = (state[locale] ??= {})

  const todo = Object.entries(enFlat).filter(([key, source]) => {
    if (force || current[key] === undefined) return true
    // Existing translation without recorded state = hand-written; keep it.
    return localeState[key] !== undefined && localeState[key] !== hash(source)
  })

  console.log(`${locale}: ${todo.length} strings to translate`)
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE)
    const result = await translateBatch(language, batch)
    for (const [key, value] of Object.entries(result)) {
      current[key] = value
      localeState[key] = hash(enFlat[key])
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, todo.length)}/${todo.length}`)
    // Save after every batch so an interrupted run loses nothing.
    writeFileSync(file, JSON.stringify(build(en, current) ?? {}, null, 2) + "\n")
    // Merge into the latest state so runs for different locales can go in parallel.
    const latest = readJson(STATE_FILE, {})
    latest[locale] = localeState
    writeFileSync(STATE_FILE, JSON.stringify(latest, null, 2) + "\n")
  }
}

console.log("Done. Native-speaker review is still required for ar, ur and fa before launch.")
