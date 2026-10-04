import type { Locale } from "./locales"
import en from "../messages/en.json"

type Messages = Record<string, unknown>

// Any key missing from a translation falls back to English, so a partially
// translated locale never shows raw keys.
function withFallback(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key]
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && baseValue && typeof baseValue === "object"
        ? withFallback(baseValue as Messages, value as Messages)
        : value
  }
  return out
}

/** Messages for a locale, merged over English. Used by pages and by emails. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return en
  return withFallback(en as Messages, (await import(`../messages/${locale}.json`)).default as Messages)
}

/** Whether a locale's own file (not the English fallback) has a message. */
export async function hasOwnMessage(locale: Locale, path: string[]): Promise<boolean> {
  if (locale === "en") return true
  try {
    let node: unknown = (await import(`../messages/${locale}.json`)).default
    for (const key of path) node = node && typeof node === "object" ? (node as Messages)[key] : undefined
    return typeof node === "string" && node.length > 0
  } catch {
    return false
  }
}

export type Translate = (key: string, values?: Record<string, string | number | Date>) => string

/** Server-side translator outside a request (emails, agents). Keys are plain strings. */
export async function translator(locale: Locale, namespace?: string): Promise<Translate> {
  const { createTranslator } = await import("next-intl")
  const t = createTranslator({ locale, messages: (await loadMessages(locale)) as never, namespace: namespace as never })
  return t as unknown as Translate
}
