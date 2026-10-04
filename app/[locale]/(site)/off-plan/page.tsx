import type { Metadata } from "next"
import { CalendarClock, Coins, Layers, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getDevelopers, getProjects, getNameMaps, localize } from "@/lib/data"
import { formatMoney, formatPercent, quarterParts } from "@/lib/format"
import { PageHero } from "@/components/site/page-hero"
import { EmptyNote } from "@/components/site/empty-note"
import { SectionHeader } from "@/components/site/section-header"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { HorizontalScroll } from "@/components/motion/horizontal-scroll"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Reveal } from "@/components/reveal"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "offPlan" })
  return pageMetadata({ locale, pathname: "/off-plan", title: t("title"), description: t("subtitle") })
}

const icons = [Coins, Layers, ShieldCheck, CalendarClock]

export default async function OffPlanPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("offPlan")
  const tc = await getTranslations("common")
  const td = await getTranslations("developers")
  const [projects, developers, names] = await Promise.all([getProjects(), getDevelopers(), getNameMaps()])
  const reasons = t.raw("why.items") as { title: string; body: string }[]

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="off-plan" />

      <section className="container-custom py-16 md:py-24">
        <SectionHeader title={t("why.title")} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => {
            const Icon = icons[i]
            return (
              <li key={r.title}>
                <Reveal delay={i * 0.06} className="h-full rounded-3xl bg-sand-100/60 p-6">
                  <Icon className="h-6 w-6 text-rose-500" />
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{r.body}</p>
                </Reveal>
              </li>
            )
          })}
        </ul>
      </section>

      {projects.length === 0 ? (
        <section className="bg-neutral-50 py-16 md:py-20">
          <div className="container-custom">
            <SectionHeader title={t("launches.title")} subtitle={t("launches.subtitle")} />
            <EmptyNote topic="launches" className="bg-white" />
          </div>
        </section>
      ) : (
      <HorizontalScroll
        className="bg-neutral-50 py-16 md:py-0"
        header={
          <div className="container-custom mb-10 flex flex-wrap items-end justify-between gap-4">
            <SectionHeader title={t("launches.title")} subtitle={t("launches.subtitle")} className="mb-0 md:mb-0" />
            <SampleNote />
          </div>
        }
      >
        {projects.map((p) => (
          <TransitionLink
            key={p.slug}
            href={`/off-plan/${p.slug}`}
            className="group block w-[80vw] shrink-0 overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200 sm:w-[440px]"
          >
            <div className="relative aspect-[16/10] overflow-hidden" style={{ viewTransitionName: `project-${p.slug}` }}>
              <Photo photo={areaPhoto(p.communitySlug)} sizes="(min-width: 640px) 440px, 80vw" className="transition-transform duration-700 group-hover:scale-105" />
              <span className="badge-shimmer absolute start-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">{tc("status.newLaunch")}</span>
            </div>
            <div className="space-y-2 p-6">
              <p className="text-sm text-neutral-500">
                {names.communities[p.communitySlug]} · {names.developers[p.developerSlug]}
              </p>
              <h3 className="text-2xl font-semibold text-neutral-900">{p.name}</h3>
              <p className="text-neutral-600">{localize(p.summary, locale)}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-sm text-neutral-700">
                <span>
                  {tc("from")} <strong>{formatMoney(p.launchPriceAed, "AED", locale)}</strong>
                </span>
                <span>{tc("handover", { quarter: tc("quarter", quarterParts(p.handover, locale)) })}</span>
                <span>
                  {p.paymentPlan.onBooking}/{p.paymentPlan.duringConstruction}/{p.paymentPlan.onHandover}
                  {p.paymentPlan.postHandover > 0 && `/${p.paymentPlan.postHandover}`}
                </span>
              </div>
            </div>
          </TransitionLink>
        ))}
      </HorizontalScroll>
      )}

      <section className="container-custom py-16 md:py-24">
        <div className="grid gap-10 rounded-[2rem] bg-navy-900 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <ShieldCheck className="h-8 w-8 text-rose-300" />
            <h2 className="mt-6 text-3xl font-semibold leading-tight md:text-4xl">{t("risk.title")}</h2>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-white/80">{t("risk.body")}</p>
            <p className="mt-4 text-xs text-white/50">{t("risk.source")}</p>
          </div>
        </div>
      </section>

      {developers.length > 0 && (
      <section className="container-custom pb-8">
        <SectionHeader title={td("title")} subtitle={td("subtitle")} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {developers.map((d) => (
            <li key={d.slug}>
              <TransitionLink href={`/developers/${d.slug}`} className="block rounded-3xl p-6 ring-1 ring-neutral-200 transition-colors hover:ring-rose-300">
                <p className="font-semibold text-neutral-900">{d.name}</p>
                <p className="mt-2 text-sm text-neutral-500">
                  {td("onTime")}: {d.onTimeRate !== null ? formatPercent(d.onTimeRate, locale, 0) : tc("pendingData")}
                </p>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </section>
      )}

      <CtaBand />
    </main>
  )
}
