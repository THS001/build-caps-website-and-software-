import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { PageHero } from "@/components/site/page-hero"
import { SectionHeader } from "@/components/site/section-header"
import { CtaBand } from "@/components/site/cta-band"
import { TransitionLink } from "@/components/motion/view-transitions"
import { TiltCard } from "@/components/motion/tilt-card"
import { calculators } from "@/components/tools/registry"
import { aiTools } from "@/components/tools/ai-registry"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "tools" })
  return pageMetadata({ locale, pathname: "/tools", title: t("title"), description: t("subtitle") })
}


export default async function ToolsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("tools")

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="tools" />

      <section className="container-custom py-14 md:py-20">
        <SectionHeader title={t("groups.calculators")} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map(({ key, slug, icon: Icon }) => (
            <li key={key}>
              <TiltCard max={4} className="h-full rounded-3xl">
                <TransitionLink href={`/tools/${slug}`} className="group flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-neutral-200">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
                    <Icon className="h-6 w-6 text-rose-500" />
                  </span>
                  <h2 className="mt-6 text-xl font-semibold text-neutral-900">{t(`calculators.${key}.title`)}</h2>
                  <p className="mt-2 flex-1 text-neutral-600">{t(`calculators.${key}.body`)}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-neutral-900">
                    {t("try")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </span>
                </TransitionLink>
              </TiltCard>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden bg-navy-900 py-16 text-white md:py-24">
        <div className="pointer-events-none absolute -top-40 end-0 h-96 w-96 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="container-custom relative">
          <SectionHeader tone="dark" title={t("groups.ai")} subtitle={t("aiIntro")} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiTools.map(({ key, slug, status, icon: Icon }) => (
              <li key={key}>
                <TransitionLink href={`/tools/${slug}`} className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-rose-300/50 hover:bg-white/[0.07]">
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-6 w-6 text-rose-300" />
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">{t(`status.${status}`)}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{t(`aiTools.${key}.title`)}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">{t(`aiTools.${key}.body`)}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    {t("try")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </span>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </main>
  )
}
