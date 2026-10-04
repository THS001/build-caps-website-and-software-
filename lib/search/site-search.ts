import "server-only"
import { getTranslations } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { getCommunities, getDevelopers, getNameMaps, getPosts, getProjects, getProperties, localize } from "@/lib/data"
import { aiTools } from "@/components/tools/ai-registry"
import { calculators } from "@/components/tools/registry"
import { services } from "@/components/site/services"
import { formatMoney } from "@/lib/format"

// Instant site search (no AI): listings, areas, projects, developers, articles,
// tools and pages, matched in the visitor's language and in English.

export type SearchGroupKey = "listings" | "areas" | "projects" | "developers" | "articles" | "tools" | "pages"
export type SearchHit = { title: string; subtitle?: string; href: string; image?: string }
export type SearchGroup = { key: SearchGroupKey; items: SearchHit[] }

type Entry = SearchHit & { group: SearchGroupKey; primary: string; extra: string }

/** Lowercase without accents, so "Créek" finds "creek". */
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

async function entries(locale: Locale): Promise<Entry[]> {
  const [t, tn, ts, properties, communities, projects, developers, posts, names] = await Promise.all([
    getTranslations({ locale, namespace: "tools" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "services" }),
    getProperties(),
    getCommunities(),
    getProjects(),
    getDevelopers(),
    getPosts(),
    getNameMaps(),
  ])
  // Plain paths: the client router adds the language prefix.
  const href = (path: string) => path
  const out: Entry[] = []

  for (const p of properties) {
    const title = localize(p.title, locale)
    const community = names.communities[p.communitySlug] ?? ""
    out.push({
      group: "listings",
      title,
      subtitle: [community, p.priceAed ? formatMoney(p.priceAed, "AED", locale, { compact: true }) : null, p.beds === 0 ? "Studio" : `${p.beds} BR`].filter(Boolean).join(" · "),
      href: href(`/properties/${p.slug}`),
      image: p.images[0]?.src,
      primary: `${title} ${p.title.en} ${community}`,
      extra: `${p.type} ${p.status} ${p.keywords.join(" ")} ${localize(p.description, locale)}`,
    })
  }
  for (const c of communities) {
    out.push({ group: "areas", title: c.name, subtitle: localize(c.summary, locale).slice(0, 90), href: href(`/communities/${c.slug}`), primary: c.name, extra: `${localize(c.summary, locale)} ${localize(c.lifestyle, locale)}` })
  }
  for (const p of projects) {
    out.push({ group: "projects", title: p.name, subtitle: [names.communities[p.communitySlug], names.developers[p.developerSlug]].filter(Boolean).join(" · "), href: href(`/off-plan/${p.slug}`), primary: `${p.name} ${names.developers[p.developerSlug] ?? ""}`, extra: localize(p.summary, locale) })
  }
  for (const d of developers) {
    out.push({ group: "developers", title: d.name, href: href(`/developers/${d.slug}`), primary: d.name, extra: localize(d.summary, locale) })
  }
  for (const post of posts) {
    const title = localize(post.title, locale)
    out.push({ group: "articles", title, subtitle: localize(post.excerpt, locale).slice(0, 100), href: href(`/insights/${post.slug}`), primary: `${title} ${post.title.en}`, extra: localize(post.excerpt, locale) })
  }
  for (const tool of aiTools) {
    out.push({ group: "tools", title: t(`aiTools.${tool.key}.title`), subtitle: t(`aiTools.${tool.key}.body`), href: href(`/tools/${tool.slug}`), primary: `${t(`aiTools.${tool.key}.title`)} ${tool.slug.replace(/-/g, " ")}`, extra: t(`aiTools.${tool.key}.body`) })
  }
  for (const c of calculators) {
    out.push({ group: "tools", title: t(`calculators.${c.key}.title`), subtitle: t(`calculators.${c.key}.body`), href: href(`/tools/${c.slug}`), primary: `${t(`calculators.${c.key}.title`)} ${c.slug.replace(/-/g, " ")}`, extra: t(`calculators.${c.key}.body`) })
  }
  for (const s of services) {
    out.push({ group: "pages", title: ts(`${s.key}.title`), href: href(`/services/${s.slug}`), primary: `${ts(`${s.key}.title`)} ${s.slug}`, extra: "" })
  }
  const pages: [string, string][] = [
    ["/properties", "properties"], ["/off-plan", "offPlan"], ["/opportunities", "opportunities"], ["/communities", "communities"], ["/developers", "developers"], ["/invest", "invest"],
    ["/tools", "tools"], ["/insights", "insights"], ["/market-reports", "reports"], ["/about", "about"], ["/team", "team"], ["/careers", "careers"], ["/contact", "contact"], ["/faq", "faq"], ["/book", "book"],
  ]
  for (const [path, key] of pages) out.push({ group: "pages", title: tn(key), href: href(path), primary: `${tn(key)} ${path.slice(1).replace(/-/g, " ")}`, extra: "" })
  return out
}

// The index is rebuilt at most every 5 minutes per language, so typing stays instant.
const INDEX_TTL = 5 * 60_000
const indexes = new Map<Locale, { at: number; entries: Promise<Entry[]> }>()

function cachedEntries(locale: Locale) {
  const hit = indexes.get(locale)
  if (hit && Date.now() - hit.at < INDEX_TTL) return hit.entries
  const entriesPromise = entries(locale).catch((error) => {
    indexes.delete(locale)
    throw error
  })
  indexes.set(locale, { at: Date.now(), entries: entriesPromise })
  return entriesPromise
}

const ORDER: SearchGroupKey[] = ["listings", "areas", "projects", "developers", "articles", "tools", "pages"]

/** Every word of the query must appear; title matches and word starts rank first. */
export async function siteSearch(query: string, locale: Locale): Promise<SearchGroup[]> {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1 || /\P{ASCII}/u.test(w))
  if (!words.length) return []
  const scored = (await cachedEntries(locale))
    .map((e) => {
      const primary = norm(e.primary)
      const all = `${primary} ${norm(e.extra)}`
      let score = 0
      for (const w of words) {
        if (!all.includes(w)) return null
        score += primary.includes(w) ? (new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(primary) ? 4 : 3) : 1
      }
      return { e, score }
    })
    .filter((x): x is { e: Entry; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)

  return ORDER.map((key) => ({
    key,
    items: scored
      .filter((s) => s.e.group === key)
      .slice(0, key === "listings" ? 6 : 4)
      .map(({ e }) => ({ title: e.title, subtitle: e.subtitle, href: e.href, image: e.image })),
  })).filter((g) => g.items.length)
}
