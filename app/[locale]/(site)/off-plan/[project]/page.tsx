import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getCommunity, getDeveloper, getNameMaps, getProject, getProjects, getProperties, localize } from "@/lib/data"
import { formatMoney, formatPercent, quarterParts } from "@/lib/format"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"
import { PaymentPlanBar } from "@/components/property/payment-plan"
import { PropertyCard } from "@/components/property/property-card"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale; project: string }> }

export async function generateStaticParams() {
  const projects = await getProjects()
  return locales.flatMap((locale) => projects.map((p) => ({ locale, project: p.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, project: slug } = await params
  const project = await getProject(slug)
  if (!project) return {}
  return pageMetadata({ locale, pathname: `/off-plan/${slug}`, title: project.name, description: localize(project.summary, locale) })
}

export default async function ProjectPage({ params }: Props) {
  const { locale, project: slug } = await params
  setRequestLocale(locale)
  const project = await getProject(slug)
  if (!project) notFound()

  const [developer, community, units, names] = await Promise.all([
    getDeveloper(project.developerSlug),
    getCommunity(project.communitySlug),
    getProperties().then((all) => all.filter((p) => p.projectSlug === slug)),
    getNameMaps(),
  ])
  const t = await getTranslations("offPlan.project")
  const tc = await getTranslations("common")
  const tn = await getTranslations("nav")

  const facts = [
    { label: t("launchPrice"), value: `${tc("from")} ${formatMoney(project.launchPriceAed, "AED", locale)}` },
    { label: t("handover"), value: tc("quarter", quarterParts(project.handover, locale)) },
    { label: t("unitTypes"), value: project.unitTypes },
    { label: t("developer"), value: developer?.name ?? "—" },
  ]

  return (
    <main id="main" className="pt-24 md:pt-28">
      <div className="container-custom">
        <Breadcrumbs items={[{ label: tn("offPlan"), href: "/off-plan" }, { label: project.name, href: `/off-plan/${slug}` }]} />

        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[2rem] md:aspect-[21/9]" style={{ viewTransitionName: `project-${slug}` }}>
          <Photo photo={areaPhoto(project.communitySlug)} alt={project.name} priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
            <p className="text-sm text-white/80">
              {community?.name} · {developer?.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold md:text-6xl">{project.name}</h1>
          </div>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <div className="space-y-14 lg:col-span-8">
            <p className="text-xl leading-relaxed text-neutral-700">{localize(project.summary, locale)}</p>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-neutral-200 ring-1 ring-neutral-200 md:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="bg-white p-5">
                  <dt className="text-xs text-neutral-500">{f.label}</dt>
                  <dd className="mt-2 font-semibold text-neutral-900">{f.value}</dd>
                </div>
              ))}
            </dl>

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("paymentPlan")}</h2>
              <PaymentPlanBar plan={project.paymentPlan} />
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-neutral-900">{t("progress")}</h2>
              <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500 rtl:bg-gradient-to-l" style={{ width: `${project.constructionProgress * 100}%` }} />
              </div>
              <p className="mt-3 text-sm text-neutral-600">{t("progressValue", { value: formatPercent(project.constructionProgress, locale, 0) })}</p>
              {project.escrowRegistered && (
                <p className="mt-4 flex items-center gap-2 font-medium text-neutral-900">
                  <ShieldCheck className="h-5 w-5 text-rose-500" />
                  {t("escrow")}
                </p>
              )}
              <SampleNote className="mt-4" />
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("location")}</h2>
              <div className="h-80">
                <LazyPropertyMap label={project.name} className="h-full w-full" pins={[{ id: slug, lat: project.geo.lat, lng: project.geo.lng, label: project.name }]} />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="space-y-4 rounded-3xl bg-sand-100/70 p-6 lg:sticky lg:top-28">
              <p className="text-lg font-semibold text-neutral-900">{t("register")}</p>
              <p className="text-sm text-neutral-600">{t("registerBody")}</p>
              <TransitionLink href={`/book?purpose=strategy&project=${slug}`} className="glow-rose flex h-12 items-center justify-center rounded-xl bg-neutral-900 font-semibold text-white">
                {tc("bookCall")}
              </TransitionLink>
              {developer && (
                <TransitionLink href={`/developers/${developer.slug}`} className="block text-center text-sm font-medium text-neutral-700 hover:underline">
                  {t("aboutDeveloper", { name: developer.name })}
                </TransitionLink>
              )}
            </div>
          </aside>
        </div>

        {units.length > 0 && (
          <section className="py-20">
            <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("units")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SeoExtras locale={locale} pathname={`/off-plan/${slug}`} />
      <CtaBand />
    </main>
  )
}
