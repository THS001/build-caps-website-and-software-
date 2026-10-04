// 301 redirects from the old WordPress site (buildcaps.com, Houzez theme), built
// from its Yoast sitemaps on 2026-10-03, so existing rankings and links carry
// over. Blog posts keep their slugs under /insights (scripts/migrate-wp-posts.mjs).
// Used by next.config.mjs. Each source also matches with a trailing slash.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const postSlugs = JSON.parse(readFileSync(join(import.meta.dirname, "wp-post-slugs.json"), "utf8"))

const pages = {
  "/home-blue": "/",
  "/elementor-hf/foot": "/",
  "/about-blue": "/about",
  "/author/admin": "/about",
  "/agents-2": "/team",
  "/agent": "/team",
  "/agency": "/developers",
  "/career": "/careers",
  "/frequently-asked-questions": "/faq",
  "/inquiry-form": "/contact",
  "/privacy-policy": "/privacy",
  "/terms-and-conditions": "/terms",
  "/blog": "/insights",
  "/category/buildcaps": "/insights",
  "/secondary-projects": "/properties?status=ready",
  "/property": "/properties",
  "/search-results": "/properties",
  "/listings-with-elementor": "/properties",
  "/list-layout-full-width": "/properties",
  "/apartments-in-new-york": "/properties",
  "/typography": "/",
  "/property-type/apartment": "/properties?type=apartment",
  "/property-type/villa": "/properties?type=villa",
  "/property-type/residential": "/properties",
  "/status/for-sale": "/properties",
  "/status/for-rent": "/properties",
  "/label/off-plan": "/off-plan",
  "/label/open-house": "/properties",
  "/city/downtown-dubai": "/communities/downtown-dubai",
  "/city/dubai-marina": "/communities/dubai-marina",
  "/city/dubai-creek-harbour": "/communities/dubai-creek-harbour",
  "/country/unitedarabemirates": "/communities",
  // Developer pages on the old site. Point them at /developers/<slug> once the
  // real developers are loaded with these slugs.
  "/damac": "/developers",
  "/emaar": "/developers",
  "/bnw": "/developers",
  "/sobha-realty": "/developers",
  "/binghatti": "/developers",
  "/azizi-developer": "/developers",
  "/all-american-real-estate": "/developers",
}

const patterns = {
  "/agency/:slug": "/developers",
  "/agent/:slug": "/team",
  "/label/:slug": "/developers",
  "/property/:slug": "/properties",
  "/property-type/:slug": "/properties",
  "/feature/:slug": "/properties",
  "/city/:slug": "/communities",
  "/state/:slug": "/communities",
  "/area/:slug": "/communities",
  "/feed": "/insights",
}

const rule = (source, destination) => ({ source: `${source}{/}?`, destination, statusCode: 301 })

export const legacyRedirects = [
  ...Object.entries(pages).map(([s, d]) => rule(s, d)),
  ...postSlugs.map((slug) => rule(`/${slug}`, `/insights/${slug}`)),
  ...Object.entries(patterns).map(([s, d]) => rule(s, d)),
]
