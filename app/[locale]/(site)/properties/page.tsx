import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata, localizedPath } from "@/lib/seo"
import { getCommunities, getDevelopers, getNameMaps, getProperties, localize } from "@/lib/data"
import { formatMoney } from "@/lib/format"
import { paramsToFilters } from "@/lib/search/parse-query"
import { PageHero } from "@/components/site/page-hero"
import { SampleNote } from "@/components/site/sample-note"
import { LeadMagnet } from "@/components/site/lead-magnet"
import { AskSearch } from "@/components/search/ask-search"
import { FiltersBar } from "@/components/property/filters-bar"
import { PropertyCard } from "@/components/property/property-card"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "properties" })
  return pageMetadata({ locale, pathname: "/properties", title: t("title"), description: t("subtitle") })
}

export default async function PropertiesPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const t = await getTranslations("properties")

  const filters = paramsToFilters(sp)
  const query = typeof sp.q === "string" ? sp.q : undefined
  const view = sp.view === "map" ? "map" : "grid"

  const [results, communities, developers, names, all] = await Promise.all([
    getProperties(filters),
    getCommunities(),
    getDevelopers(),
    getNameMaps(),
    getProperties(),
  ])
  const handoverYears = [...new Set(all.flatMap((p) => (p.handover ? [new Date(p.handover).getUTCFullYear()] : [])))].sort()

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="properties">
        <AskSearch initialQuery={query} compact className="max-w-2xl" />
      </PageHero>

      <section className="container-custom py-10">
        <FiltersBar
          filters={filters}
          query={query}
          view={view}
          communities={communities.map((c) => ({ value: c.slug, label: c.name }))}
          developers={developers.map((d) => ({ value: d.slug, label: d.name }))}
          handoverYears={handoverYears}
        />

        <div className="mt-8 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium text-neutral-900" aria-live="polite">
            {t("results", { count: results.length })}
          </p>
          <SampleNote />
        </div>

        {results.length === 0 ? (
          <div className="rounded-3xl bg-sand-100 p-10 text-center md:p-16">
            <h2 className="text-2xl font-semibold text-neutral-900">{t("empty.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-600">{t("empty.body")}</p>
            <TransitionLink href="/book?purpose=strategy" className="mt-8 inline-flex rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white">
              {t("empty.cta")}
            </TransitionLink>
          </div>
        ) : view === "map" ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="h-[60vh] lg:sticky lg:top-24 lg:col-span-3 lg:h-[calc(100svh-8rem)]">
              <LazyPropertyMap
                label={t("view.map")}
                className="h-full w-full"
                pins={results.map((p) => ({
                  id: p.slug,
                  lat: p.geo.lat,
                  lng: p.geo.lng,
                  label: p.priceAed ? formatMoney(p.priceAed, "AED", locale) : localize(p.title, locale),
                  href: localizedPath(`/properties/${p.slug}`, locale),
                }))}
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
              {results.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p, i) => (
              <PropertyCard key={p.slug} property={p} priority={i < 3} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
            ))}
          </div>
        )}
      </section>

      <LeadMagnet source="properties" />
    </main>
  )
}
