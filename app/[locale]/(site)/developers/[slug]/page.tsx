import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getDeveloper, getDevelopers, getNameMaps, getProjects, getProperties, localize } from "@/lib/data"
import { formatMoney, formatPercent, quarterParts } from "@/lib/format"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"
import { PropertyCard } from "@/components/property/property-card"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const developers = await getDevelopers()
  return locales.flatMap((locale) => developers.map((d) => ({ locale, slug: d.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const developer = await getDeveloper(slug)
  if (!developer) return {}
  return pageMetadata({ locale, pathname: `/developers/${slug}`, title: developer.name, description: localize(developer.summary, locale) })
}

export default async function DeveloperPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const developer = await getDeveloper(slug)
  if (!developer) notFound()

  const [projects, listings, names] = await Promise.all([
    getProjects().then((all) => all.filter((p) => p.developerSlug === slug)),
    getProperties({ developer: slug }),
    getNameMaps(),
  ])
  const t = await getTranslations("developers")
  const tc = await getTranslations("common")
  const tn = await getTranslations("nav")

  const metrics = [
    { label: t("delivered"), value: developer.deliveredProjects },
    { label: t("onTime"), value: developer.onTimeRate !== null ? formatPercent(developer.onTimeRate, locale, 0) : null },
    { label: t("promisesKept"), value: developer.promisesKept !== null ? formatPercent(developer.promisesKept, locale, 0) : null },
    { label: t("liveProjects"), value: projects.length },
  ]

  return (
    <main id="main" className="pt-24 md:pt-28">
      <div className="container-custom">
        <Breadcrumbs items={[{ label: tn("developers"), href: "/developers" }, { label: developer.name, href: `/developers/${slug}` }]} />
        <header className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-semibold text-neutral-900 md:text-6xl">{developer.name}</h1>
          <p className="mt-5 text-lg text-neutral-600">{localize(developer.summary, locale)}</p>
          {developer.founded && <p className="mt-2 text-sm text-neutral-500">{t("founded", { year: developer.founded })}</p>}
        </header>

        <section className="py-12">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-3xl bg-sand-100/70 p-6">
                <dt className="text-sm text-neutral-500">{m.label}</dt>
                <dd className="mt-2 text-3xl font-bold text-neutral-900">{m.value ?? <span className="text-base font-medium text-neutral-500">{tc("pendingData")}</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-neutral-500">{t("metricsNote")}</p>
          <SampleNote className="mt-3" />
        </section>

        {projects.length > 0 && (
          <section className="pb-14">
            <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("liveProjects")}</h2>
            <ul className="grid gap-6 md:grid-cols-2">
              {projects.map((p) => (
                <li key={p.slug}>
                  <TransitionLink href={`/off-plan/${p.slug}`} className="group grid overflow-hidden rounded-3xl ring-1 ring-neutral-200 sm:grid-cols-5">
                    <div className="relative aspect-[16/10] sm:col-span-2 sm:aspect-auto" style={{ viewTransitionName: `project-${p.slug}` }}>
                      <Photo photo={areaPhoto(p.communitySlug)} sizes="(min-width: 768px) 33vw, 100vw" />
                    </div>
                    <div className="p-6 sm:col-span-3">
                      <p className="text-sm text-neutral-500">{names.communities[p.communitySlug]}</p>
                      <h3 className="mt-1 text-xl font-semibold text-neutral-900 group-hover:underline">{p.name}</h3>
                      <p className="mt-3 text-sm text-neutral-700">
                        {tc("from")} {formatMoney(p.launchPriceAed, "AED", locale)} · {tc("handover", { quarter: tc("quarter", quarterParts(p.handover, locale)) })}
                      </p>
                    </div>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </section>
        )}

        {listings.length > 0 && (
          <section className="pb-20">
            <h2 className="mb-8 text-2xl font-semibold text-neutral-900">{t("listings", { name: developer.name })}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SeoExtras locale={locale} pathname={`/developers/${slug}`} />
      <CtaBand />
    </main>
  )
}
