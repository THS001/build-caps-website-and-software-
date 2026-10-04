import type { Metadata } from "next"
import { ArrowRight, BarChart3, Compass, Eye, LineChart, ScrollText, ShieldCheck, Sparkles, Telescope, Users } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { site } from "@/lib/site"
import { getCommunities, getCompanyStats, getFeaturedProperties, getFunnels, getNameMaps, getPosts } from "@/lib/data"
import { Hero } from "@/components/home/hero"
import { RiseOfDubai } from "@/components/home/rise-of-dubai"
import { PropertyCard } from "@/components/property/property-card"
import { FunnelCard } from "@/components/cards/funnel-card"
import { CommunityCard } from "@/components/cards/community-card"
import { PostCard } from "@/components/cards/post-card"
import { SectionHeader } from "@/components/site/section-header"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"
import { JsonLd } from "@/components/site/json-ld"
import { HorizontalScroll } from "@/components/motion/horizontal-scroll"
import { CountUp } from "@/components/motion/count-up"
import { TextScrub } from "@/components/motion/text-scrub"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Reveal } from "@/components/reveal"

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "meta" })
  return pageMetadata({ locale, pathname: "/", title: t("defaultTitle"), description: t("defaultDescription"), absoluteTitle: true })
}

const aiTools = [
  { key: "estimate", icon: LineChart },
  { key: "wealthTwin", icon: Telescope },
  { key: "handoverScore", icon: ShieldCheck },
  { key: "matchMe", icon: Compass },
  { key: "dataRoom", icon: BarChart3 },
  { key: "futureView", icon: Eye },
] as const

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <TransitionLink href={href} className="group inline-flex items-center gap-2 font-semibold text-neutral-900">
      {label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
    </TransitionLink>
  )
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("home")
  const tTools = await getTranslations("tools.aiTools")
  const tMeta = await getTranslations("meta")

  const [featured, funnels, communities, posts, names, stats] = await Promise.all([
    getFeaturedProperties(6),
    getFunnels(locale as Locale),
    getCommunities(),
    getPosts(),
    getNameMaps(),
    getCompanyStats(),
  ])

  const chapters = t.raw("story.chapters") as { year: string; title: string; body: string }[]
  const steps = t.raw("remote.steps") as { title: string; body: string }[]
  const points = t.raw("proof.points") as { title: string; body: string }[]

  return (
    <main id="main">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: site.legalName,
          url: site.url,
          email: site.email,
          telephone: site.phones[0].display,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Office 1604, Conrad Office Tower, Sheikh Zayed Road",
            addressLocality: "Dubai",
            addressCountry: "AE",
          },
          geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
          sameAs: site.social.map((s) => s.href),
          description: tMeta("defaultDescription"),
        }}
      />

      <Hero />

      {/* Featured properties */}
      {featured.length > 0 && (
      <section data-buddy="featured" className="container-custom py-16 md:py-24">
        <SectionHeader
          eyebrow={t("featured.eyebrow")}
          title={t("featured.title")}
          subtitle={t("featured.subtitle")}
          action={<ViewAll href="/properties" label={t("featured.cta")} />}
        />
        <SampleNote className="mb-6" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.08}>
              <PropertyCard property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* Opportunities (funnels) */}
      {funnels.length > 0 && (
        <section data-buddy="opportunities" className="bg-neutral-50 py-16 md:py-24">
          <div className="container-custom">
            <SectionHeader
              eyebrow={t("opportunities.eyebrow")}
              title={t("opportunities.title")}
              subtitle={t("opportunities.subtitle")}
              action={<ViewAll href="/opportunities" label={t("opportunities.cta")} />}
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {funnels.slice(0, 4).map((f) => (
                <FunnelCard key={f.slug} funnel={f} source="home" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Dubai: pinned skyline story */}
      <RiseOfDubai
        eyebrow={t("story.eyebrow")}
        title={t("story.title")}
        milestones={chapters.map((c) => ({ year: Number(c.year), title: c.title, body: c.body }))}
      />

      {/* Communities */}
      {communities.length > 0 && (
      <div data-buddy="communities">
      <HorizontalScroll
        className="py-16 md:py-0"
        header={
          <div className="container-custom mb-10">
            <SectionHeader eyebrow={t("communities.eyebrow")} title={t("communities.title")} subtitle={t("communities.subtitle")} className="mb-0 md:mb-0" />
          </div>
        }
      >
        {communities.map((c) => (
          <CommunityCard key={c.slug} community={c} className="w-[72vw] shrink-0 sm:w-[340px]" />
        ))}
      </HorizontalScroll>
      </div>
      )}

      {/* AI tools */}
      <section data-buddy="tools" className="relative overflow-hidden bg-navy-900 py-20 text-white md:py-28">
        <div className="pointer-events-none absolute -top-40 start-1/4 h-96 w-96 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="container-custom relative">
          <SectionHeader
            tone="dark"
            eyebrow={t("ai.eyebrow")}
            title={t("ai.title")}
            subtitle={t("ai.subtitle")}
            action={
              <TransitionLink href="/tools" className="inline-flex items-center gap-2 font-semibold text-rose-200">
                {t("ai.cta")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </TransitionLink>
            }
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiTools.map(({ key, icon: Icon }, i) => (
              <li key={key}>
                <Reveal delay={(i % 3) * 0.08} className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:border-rose-300/40">
                  <Icon className="h-6 w-6 text-rose-300" />
                  <h3 className="mt-5 text-lg font-semibold">{tTools(`${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{tTools(`${key}.body`)}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Proof */}
      <section className="container-custom py-20 md:py-28">
        <SectionHeader eyebrow={t("proof.eyebrow")} title={t("proof.title")} />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-rose-metal text-7xl font-bold md:text-8xl">
              <CountUp value={stats.years} />+
            </p>
            <p className="mt-2 text-neutral-600">{t("proof.years")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:col-span-8">
            {points.map((point, i) => {
              const Icon = [ScrollText, ShieldCheck, BarChart3][i] ?? Sparkles
              return (
                <li key={point.title} className="rounded-3xl bg-sand-100/60 p-6">
                  <Icon className="h-6 w-6 text-rose-500" />
                  <h3 className="mt-4 font-semibold text-neutral-900">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{point.body}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Buying remotely */}
      <section className="bg-aurora py-20 md:py-28">
        <div className="container-custom">
          <SectionHeader eyebrow={t("remote.eyebrow")} title={t("remote.title")} />
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 0.08} className="relative h-full rounded-3xl bg-white p-6 ring-1 ring-neutral-200">
                  <span className="text-rose-metal text-5xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          <TextScrub text={t("remote.closing")} className="mx-auto mt-16 max-w-3xl text-center text-2xl font-medium leading-snug text-neutral-900 md:text-4xl" />
        </div>
      </section>

      {/* Insights */}
      <section data-buddy="insights" className="container-custom py-20 md:py-28">
        <SectionHeader eyebrow={t("insights.eyebrow")} title={t("insights.title")} action={<ViewAll href="/insights" label={t("insights.cta")} />} />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      <SeoExtras locale={locale as Locale} pathname="/" />
      <CtaBand />
    </main>
  )
}
