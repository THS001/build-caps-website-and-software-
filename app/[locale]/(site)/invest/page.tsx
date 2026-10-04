import type { Metadata } from "next"
import { ArrowRight, Banknote, BadgeCheck, Building, Globe2, Landmark, Map, PlaneTakeoff, ShieldCheck, TrendingUp } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { PageHero } from "@/components/site/page-hero"
import { SectionHeader } from "@/components/site/section-header"
import { FaqList } from "@/components/site/faq-list"
import { CtaBand } from "@/components/site/cta-band"
import { TransitionLink } from "@/components/motion/view-transitions"
import { TiltCard } from "@/components/motion/tilt-card"
import { Reveal } from "@/components/reveal"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "invest" })
  return pageMetadata({ locale, pathname: "/invest", title: t("title"), description: t("subtitle") })
}

const reasonIcons = [Landmark, TrendingUp, Banknote, BadgeCheck, ShieldCheck, Map]

export default async function InvestPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("invest")
  const tf = await getTranslations("faq")
  const reasons = t.raw("reasons") as { title: string; body: string }[]
  const faqs = (tf.raw("items") as { q: string; a: string }[]).slice(0, 6)

  return (
    <main id="main">
      <PageHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} art="invest" />

      <section className="container-custom py-16 md:py-24">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r, i) => {
            const Icon = reasonIcons[i] ?? Building
            return (
              <li key={r.title}>
                <Reveal delay={(i % 3) * 0.06} className="h-full">
                  <TiltCard max={4} className="h-full rounded-3xl bg-white p-7 ring-1 ring-neutral-200">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
                      <Icon className="h-6 w-6 text-rose-500" />
                    </span>
                    <h2 className="mt-6 text-xl font-semibold text-neutral-900">{r.title}</h2>
                    <p className="mt-2 leading-relaxed text-neutral-600">{r.body}</p>
                  </TiltCard>
                </Reveal>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bg-navy-900 py-16 text-white md:py-24">
        <div className="container-custom grid items-center gap-10 md:grid-cols-2">
          <div>
            <BadgeCheck className="h-10 w-10 text-rose-300" />
            <h2 className="mt-6 text-3xl font-semibold leading-tight md:text-5xl">{t("goldenVisa.title")}</h2>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-white/80">{t("goldenVisa.body")}</p>
            <TransitionLink href="/tools/golden-visa" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-neutral-900">
              {t("goldenVisa.cta")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </TransitionLink>
          </div>
        </div>
      </section>

      <section className="container-custom grid gap-6 py-16 md:grid-cols-2 md:py-24">
        <div className="rounded-3xl bg-sand-100/70 p-8">
          <PlaneTakeoff className="h-7 w-7 text-rose-500" />
          <h2 className="mt-5 text-2xl font-semibold text-neutral-900">{t("remote.title")}</h2>
          <p className="mt-3 leading-relaxed text-neutral-600">{t("remote.body")}</p>
        </div>
        <div className="rounded-3xl bg-sand-100/70 p-8">
          <Globe2 className="h-7 w-7 text-rose-500" />
          <h2 className="mt-5 text-2xl font-semibold text-neutral-900">{t("financing.title")}</h2>
          <p className="mt-3 leading-relaxed text-neutral-600">{t("financing.body")}</p>
          <TransitionLink href="/tools/mortgage" className="mt-5 inline-flex items-center gap-2 font-semibold text-neutral-900">
            {t("financing.cta")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </TransitionLink>
        </div>
      </section>

      <section className="container-custom pb-16">
        <SectionHeader title={tf("title")} subtitle={tf("subtitle")} action={<TransitionLink href="/faq" className="font-semibold text-neutral-900 hover:underline">{t("allFaqs")}</TransitionLink>} />
        <FaqList items={faqs} schema={false} />
        <p className="mt-8 text-xs text-neutral-500">{t("disclaimer")}</p>
      </section>

      <CtaBand />
    </main>
  )
}
