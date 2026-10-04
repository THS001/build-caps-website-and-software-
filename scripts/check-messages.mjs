#!/usr/bin/env node
// Validates messages/*.json: every string must parse as ICU MessageFormat,
// keep the English placeholders, and only use keys that exist in English.
// Exits non-zero on errors; prints translation coverage per locale.

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { IntlMessageFormat } from "intl-messageformat"

const DIR = join(process.cwd(), "messages")

function flatten(node, prefix = "", out = {}) {
  if (typeof node === "string") out[prefix] = node
  else for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  return out
}

// Argument names plus the number of plural/select blocks (same rule as the
// translation script): branch text like "=0 {Studio}" isn't an argument.
const placeholders = (s) =>
  [...s.matchAll(/\{\s*([a-z][A-Za-z0-9_]*)\s*(?=[,}])/g)].map((m) => m[1]).sort().join(",") + "|" + (s.match(/\b(plural|select|selectordinal)\b/g) ?? []).length

const en = flatten(JSON.parse(readFileSync(join(DIR, "en.json"), "utf8")))
const total = Object.keys(en).length
let errors = 0

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json") && !f.startsWith(".")).sort()) {
  const locale = file.replace(".json", "")
  const flat = flatten(JSON.parse(readFileSync(join(DIR, file), "utf8")))

  for (const [key, value] of Object.entries(flat)) {
    if (!(key in en)) {
      console.error(`${locale}: unknown key ${key}`)
      errors++
      continue
    }
    try {
      new IntlMessageFormat(value, locale)
    } catch (e) {
      console.error(`${locale}: invalid ICU in ${key}: ${e.message}`)
      errors++
    }
    if (placeholders(value) !== placeholders(en[key])) {
      console.error(`${locale}: placeholder mismatch in ${key}`)
      errors++
    }
  }

  const covered = Object.keys(flat).filter((k) => k in en).length
  console.log(`${locale.padEnd(3)} ${String(covered).padStart(4)}/${total}  ${((covered / total) * 100).toFixed(0)}%`)
}

if (errors) {
  console.error(`\n${errors} error(s)`)
  process.exit(1)
}
