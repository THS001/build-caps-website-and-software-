import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Clock, Languages, Star } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getAgent, getAgents, getNameMaps, getProperties, localize, getAdvisorReviews } from "@/lib/data"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SampleNote } from "@/components/site/sample-note"
import { AdvisorScorePanel } from "@/components/cards/advisor-score"
import { CtaBand } from "@/components/site/cta-band"
import { AgentAvatar } from "@/components/cards/agent-card"
import { PropertyCard } from "@/components/property/property-card"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const agents = await getAgents()
  return locales.flatMap((locale) => agents.map((a) => ({ locale, slug: a.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const agent = await getAgent(slug)
  if (!agent) return {}
  const t = await getTranslations({ locale, namespace: "team" })
  return pageMetadata({ locale, pathname: `/team/${slug}`, title: `${agent.name}, ${t(`roles.${agent.role}`)}`, description: localize(agent.bio, locale) })
}

export default async function AgentPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const agent = await getAgent(slug)
  if (!agent) notFound()

  const [listings, names, reviews] = await Promise.all([getProperties().then((all) => all.filter((p) => p.agentSlug === slug)), getNameMaps(), getAdvisorReviews(slug)])
  const t = await getTranslations("team")
  const tc = await getTranslations("common")
  const tp = await getTranslations("property.advisor")

  return (
    <main id="main" className="pt-24 md:pt-28">
      <div className="container-custom">
        <Breadcrumbs items={[{ label: t("title"), href: "/team" }, { label: agent.name, href: `/team/${slug}` }]} />

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-6">
              <AgentAvatar agent={agent} className="h-24 w-24 text-2xl md:h-32 md:w-32 md:text-3xl" />
              <div>
                <h1 className="text-4xl font-semibold text-neutral-900 md:text-5xl">{agent.name}</h1>
                <p className="mt-2 text-lg text-neutral-500">{t(`roles.${agent.role}`)}</p>
              </div>
            </div>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-700">{localize(agent.bio, locale)}</p>

            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-sand-100/70 p-6">
                <dt className="flex items-center gap-2 text-sm text-neutral-500">
                  <Languages className="h-4 w-4 text-rose-500" />
                  {t("speaks")}
                </dt>
                <dd className="mt-2 font-semibold text-neutral-900">{agent.languages.map((l) => localeNames[l]).join(" · ")}</dd>
              </div>
              <div className="rounded-3xl bg-sand-100/70 p-6">
                <dt className="flex items-center gap-2 text-sm text-neutral-500">
                  <Star className="h-4 w-4 text-rose-500" />
                  {t("specialties")}
                </dt>
                <dd className="mt-2 font-semibold text-neutral-900">{agent.specialties.map((s) => t(`specialtyList.${s}`)).join(" · ")}</dd>
              </div>
              <div className="rounded-3xl bg-sand-100/70 p-6">
                <dt className="flex items-center gap-2 text-sm text-neutral-500">
                  <Clock className="h-4 w-4 text-rose-500" />
                  {t("responseTime")}
                </dt>
                <dd className="mt-2 font-semibold text-neutral-900">{tp("responds", { time: tc(`durations.${agent.respondsWithin}`) })}</dd>
              </div>
            </dl>
            {agent.brn && <p className="mt-6 text-sm text-neutral-500">{t("brn", { number: agent.brn })}</p>}
            <AdvisorScorePanel name={agent.name} score={agent.score} reviews={reviews} />
            <SampleNote className="mt-6" />
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-3xl bg-navy-900 p-7 text-white lg:sticky lg:top-28">
              <p className="text-xl font-semibold">{t("bookWith", { name: agent.name.split(" ")[0] })}</p>
              <p className="mt-2 text-sm text-white/70">{t("bookBody")}</p>
              <TransitionLink href={`/book?advisor=${slug}`} className="mt-6 flex h-12 items-center justify-center rounded-xl bg-white font-semibold text-neutral-900">
                {tc("bookCall")}
              </TransitionLink>
            </div>
          </aside>
        </div>

        {listings.length > 0 && (
          <section className="py-20">
            <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("listings", { name: agent.name.split(" ")[0] })}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
              ))}
            </div>
          </section>
        )}
      </div>
      <CtaBand />
    </main>
  )
}
