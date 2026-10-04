import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Bus, GraduationCap, Palmtree } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getCommunities, getCommunity, getNameMaps, getProperties, localize } from "@/lib/data"
import { formatPercent } from "@/lib/format"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"
import { PropertyCard } from "@/components/property/property-card"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { CountUp } from "@/components/motion/count-up"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const communities = await getCommunities()
  return locales.flatMap((locale) => communities.map((c) => ({ locale, slug: c.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const community = await getCommunity(slug)
  if (!community) return {}
  const t = await getTranslations({ locale, namespace: "communities" })
  return pageMetadata({ locale, pathname: `/communities/${slug}`, title: t("guideTitle", { name: community.name }), description: localize(community.summary, locale) })
}

export default async function CommunityPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const community = await getCommunity(slug)
  if (!community) notFound()

  const [listings, names] = await Promise.all([getProperties({ community: slug }), getNameMaps()])
  const t = await getTranslations("communities")
  const tn = await getTranslations("nav")

  const blocks = [
    { icon: GraduationCap, title: t("schools"), body: localize(community.schools, locale) },
    { icon: Palmtree, title: t("lifestyle"), body: localize(community.lifestyle, locale) },
    { icon: Bus, title: t("transport"), body: localize(community.transport, locale) },
  ]

  return (
    <main id="main" className="pt-24 md:pt-28">
      <div className="container-custom">
        <Breadcrumbs items={[{ label: tn("communities"), href: "/communities" }, { label: community.name, href: `/communities/${slug}` }]} />

        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[2rem] md:aspect-[21/9]" style={{ viewTransitionName: `community-${slug}` }}>
          <Photo photo={areaPhoto(slug)} alt={community.name} priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
            <h1 className="text-4xl font-semibold md:text-6xl">{community.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-white/85">{localize(community.summary, locale)}</p>
          </div>
        </div>

        <section className="py-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-neutral-900">{t("prices")}</h2>
            <SampleNote />
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-sand-100/70 p-6">
              <dt className="text-sm text-neutral-500">{t("avgPricePerSqft")}</dt>
              <dd className="mt-2 text-4xl font-bold text-neutral-900">
                <CountUp value={community.avgPricePerSqft} />
                <span className="ms-1 text-base font-medium text-neutral-500">AED</span>
              </dd>
            </div>
            <div className="rounded-3xl bg-sand-100/70 p-6">
              <dt className="text-sm text-neutral-500">{t("estYield")}</dt>
              <dd className="text-rose-metal mt-2 text-4xl font-bold">
                <CountUp value={community.estYield} format={{ style: "percent", maximumFractionDigits: 1 }} />
              </dd>
            </div>
            <div className="rounded-3xl bg-sand-100/70 p-6">
              <dt className="text-sm text-neutral-500">{t("priceChange")}</dt>
              <dd className="mt-2 text-4xl font-bold text-neutral-900">
                {community.priceChange12m >= 0 ? "+" : ""}
                {formatPercent(community.priceChange12m, locale, 0)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-neutral-500">{t("dataNote")}</p>
        </section>

        <section className="grid gap-6 pb-14 md:grid-cols-3">
          {blocks.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl p-6 ring-1 ring-neutral-200">
              <Icon className="h-6 w-6 text-rose-500" />
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
              <p className="mt-2 text-neutral-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="pb-14">
          <div className="h-80">
            <LazyPropertyMap
              label={community.name}
              className="h-full w-full"
              pins={[{ id: slug, lat: community.geo.lat, lng: community.geo.lng, label: community.name }]}
            />
          </div>
        </section>

        {listings.length > 0 && (
          <section className="pb-20">
            <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("listings", { name: community.name })}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SeoExtras locale={locale} pathname={`/communities/${slug}`} />
      <CtaBand />
    </main>
  )
}
