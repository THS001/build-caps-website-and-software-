import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getPathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { localeTags, type Locale } from "@/i18n/locales"
import { getSeoOverride } from "@/lib/seo-agent/overrides"

/** "/about" → "/about" for English, "/ar/about" for Arabic. */
export function localizedPath(pathname: string, locale: Locale) {
  return getPathname({ href: pathname, locale })
}

/**
 * Canonical plus one hreflang alternate per language. Plain language codes on
 * purpose: we target speakers of each language worldwide, not one country.
 */
export function alternatesFor(pathname: string, locale: Locale): Metadata["alternates"] {
  return {
    canonical: localizedPath(pathname, locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, localizedPath(pathname, l)])),
      "x-default": localizedPath(pathname, routing.defaultLocale),
    },
  }
}

type PageMetadataInput = {
  locale: Locale
  /** Route without the locale prefix, e.g. "/properties". */
  pathname: string
  title: string
  description: string
  /** Use the title as-is instead of the "%s | Buildcaps Real Estate" template. */
  absoluteTitle?: boolean
  image?: string
}

/**
 * Metadata every page should return from generateMetadata. Pages must set their
 * own alternates: a layout-level canonical would point every page at the home page.
 * Open Graph is rebuilt in full here because Next replaces, not merges, a parent's openGraph.
 * A title or description applied by the SEO Growth Agent (seo_overrides) wins.
 */
export async function pageMetadata({ locale, pathname, title: pageTitle, description: pageDescription, absoluteTitle, image }: PageMetadataInput): Promise<Metadata> {
  const [t, override] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getSeoOverride(locale, pathname)])
  const title = override?.title ?? pageTitle
  const description = override?.description ?? pageDescription
  const url = localizedPath(pathname, locale)
  // Next replaces the layout's openGraph object, so the default share image is repeated here.
  const images = [image ? { url: image } : { url: "/og-default.png", width: 1200, height: 630 }]

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(pathname, locale),
    openGraph: {
      siteName: t("siteName"),
      title,
      description,
      url,
      type: "website",
      locale: localeTags[locale].replace("-", "_"),
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => localeTags[l].replace("-", "_")),
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  }
}
