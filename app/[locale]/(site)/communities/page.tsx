import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata, localizedPath } from "@/lib/seo"
import { getCommunities } from "@/lib/data"
import { formatPercent } from "@/lib/format"
import { PageHero } from "@/components/site/page-hero"
import { EmptyNote } from "@/components/site/empty-note"
import { CommunityCard } from "@/components/cards/community-card"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { Reveal } from "@/components/reveal"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "communities" })
  return pageMetadata({ locale, pathname: "/communities", title: t("title"), description: t("subtitle") })
}

export default async function CommunitiesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("communities")
  const communities = await getCommunities()

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="communities" />
      <section className="container-custom py-12 md:py-16">
        {communities.length === 0 ? (
          <EmptyNote topic="communities" />
        ) : (
        <>
        <div className="mb-10 h-[50vh] min-h-80">
          <LazyPropertyMap
            label={t("title")}
            className="h-full w-full"
            pins={communities.map((c) => ({
              id: c.slug,
              lat: c.geo.lat,
              lng: c.geo.lng,
              label: `${c.name} · ${formatPercent(c.estYield, locale)}`,
              href: localizedPath(`/communities/${c.slug}`, locale),
            }))}
          />
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">{t("dataNote")}</p>
          <SampleNote />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) * 0.06}>
              <CommunityCard community={c} />
            </Reveal>
          ))}
        </div>
        </>
        )}
      </section>
      <CtaBand />
    </main>
  )
}
