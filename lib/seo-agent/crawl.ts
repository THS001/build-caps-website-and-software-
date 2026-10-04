import "server-only"
import { site } from "@/lib/site"

// A polite, minimal crawler: obeys robots.txt, identifies itself, one page at a
// time, and only extracts structure (titles, headings, schema types, word count).
// Competitor text is never stored or reused.

const UA = `BuildcapsSEOAgent/1.0 (+${site.url})`
const robotsCache = new Map<string, { rules: { allow: boolean; path: string }[] }>()

async function robots(origin: string) {
  const hit = robotsCache.get(origin)
  if (hit) return hit
  let rules: { allow: boolean; path: string }[] = []
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000), cache: "no-store" })
    if (res.ok) {
      const lines = (await res.text()).split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim())
      let applies = false
      let inGroup = false
      for (const line of lines) {
        const [rawKey, ...rest] = line.split(":")
        const key = rawKey?.trim().toLowerCase()
        const value = rest.join(":").trim()
        if (key === "user-agent") {
          if (!inGroup) applies = false
          inGroup = true
          if (value === "*" || UA.toLowerCase().startsWith(value.toLowerCase())) applies = true
        } else if (key === "allow" || key === "disallow") {
          inGroup = false
          if (applies && value) rules.push({ allow: key === "allow", path: value })
        }
      }
    } else if (res.status >= 500) rules = [{ allow: false, path: "/" }]
  } catch {
    rules = [{ allow: false, path: "/" }]
  }
  const entry = { rules }
  robotsCache.set(origin, entry)
  return entry
}

const matches = (path: string, rule: string) => {
  const pattern = "^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")
  return new RegExp(pattern).test(path)
}

/** Longest matching rule wins; allowed when nothing matches. */
export async function allowedByRobots(url: string) {
  const u = new URL(url)
  const { rules } = await robots(u.origin)
  const path = u.pathname + u.search
  let best: { allow: boolean; path: string } | null = null
  for (const r of rules) if (matches(path, r.path) && (!best || r.path.length > best.path.length)) best = r
  return best ? best.allow : true
}

export type PageAudit = {
  url: string
  status: number
  title: string | null
  description: string | null
  h1: string[]
  h2: string[]
  words: number
  schemaTypes: string[]
  faqCount: number
  internalLinks: number
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()

/** Fetches a page (if robots.txt allows) and extracts its on-page SEO structure. */
export async function auditPage(url: string): Promise<PageAudit | null> {
  if (!(await allowedByRobots(url))) return null
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(12_000), cache: "no-store", redirect: "follow" })
    const html = (await res.text()).slice(0, 1_500_000)
    const all = (re: RegExp) => [...html.matchAll(re)].map((m) => text(m[1])).filter(Boolean)
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    const schemas = all(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)
    const schemaTypes = [...new Set(schemas.flatMap((s) => [...s.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1])))]
    const origin = new URL(url).origin
    const hrefs = [...html.matchAll(/<a[^>]+href="([^"#]+)"/gi)].map((m) => m[1])
    return {
      url,
      status: res.status,
      title: all(/<title[^>]*>([\s\S]*?)<\/title>/gi)[0] ?? null,
      description: html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? html.match(/<meta[^>]+content="([^"]*)"[^>]+name="description"/i)?.[1] ?? null,
      h1: all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi).slice(0, 3),
      h2: all(/<h2[^>]*>([\s\S]*?)<\/h2>/gi).slice(0, 25),
      words: text(body).split(" ").length,
      schemaTypes,
      faqCount: schemas.reduce((n, s) => n + (s.includes("FAQPage") ? (s.match(/"Question"/g) ?? []).length : 0), 0),
      internalLinks: hrefs.filter((h) => h.startsWith("/") || h.startsWith(origin)).length,
    }
  } catch {
    return null
  }
}
