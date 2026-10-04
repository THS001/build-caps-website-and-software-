import type { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"
import { localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import { getAgents, getCommunities, getDevelopers, getJobs, getPosts, getProjects, getProperties } from "@/lib/data"
import { calculators } from "@/components/tools/registry"
import { aiTools } from "@/components/tools/ai-registry"
import { services } from "@/components/site/services"

const STATIC = [
  "/",
  "/properties",
  "/opportunities",
  "/off-plan",
  "/communities",
  "/developers",
  "/invest",
  "/tools",
  "/services",
  "/about",
  "/team",
  "/awards",
  "/careers",
  "/faq",
  "/insights",
  "/market-reports",
  "/book",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
]

/** One entry per URL in every language, each listing its hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, projects, communities, developers, agents, posts, jobs] = await Promise.all([
    getProperties(),
    getProjects(),
    getCommunities(),
    getDevelopers(),
    getAgents(),
    getPosts(),
    getJobs(),
  ])

  const paths: { path: string; lastModified?: string; priority?: number }[] = [
    ...STATIC.map((path) => ({ path, priority: path === "/" ? 1 : 0.7 })),
    ...calculators.map((c) => ({ path: `/tools/${c.slug}`, priority: 0.6 })),
    ...aiTools.map((c) => ({ path: `/tools/${c.slug}`, priority: 0.6 })),
    ...services.map((s) => ({ path: `/services/${s.slug}`, priority: 0.6 })),
    ...properties.map((p) => ({ path: `/properties/${p.slug}`, lastModified: p.publishedAt, priority: 0.8 })),
    ...projects.map((p) => ({ path: `/off-plan/${p.slug}`, priority: 0.8 })),
    ...communities.map((c) => ({ path: `/communities/${c.slug}`, priority: 0.7 })),
    ...developers.map((d) => ({ path: `/developers/${d.slug}`, priority: 0.6 })),
    ...agents.map((a) => ({ path: `/team/${a.slug}`, priority: 0.5 })),
    ...posts.map((p) => ({ path: `/insights/${p.slug}`, lastModified: p.publishedAt, priority: 0.6 })),
    ...jobs.map((j) => ({ path: `/careers/${j.slug}`, priority: 0.4 })),
  ]

  const url = (path: string, locale: (typeof routing.locales)[number]) => new URL(localizedPath(path, locale), site.url).toString()

  return paths.flatMap(({ path, lastModified, priority }) =>
    routing.locales.map((locale) => ({
      url: url(path, locale),
      lastModified,
      priority,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(path, l)])) },
    })),
  )
}
