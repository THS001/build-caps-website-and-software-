import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { services } from "@/components/site/services"
import { PageHero } from "@/components/site/page-hero"
import { CtaBand } from "@/components/site/cta-band"
import { TransitionLink } from "@/components/motion/view-transitions"
import { TiltCard } from "@/components/motion/tilt-card"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "services" })
  return pageMetadata({ locale, pathname: "/services", title: t("title"), description: t("subtitle") })
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("services")
  const tc = await getTranslations("common")

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="services" />
      <section className="container-custom py-14 md:py-20">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ slug, key, icon: Icon }) => (
            <li key={slug}>
              <TiltCard max={4} className="h-full rounded-3xl">
                <TransitionLink href={`/services/${slug}`} className="group flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-neutral-200">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
                    <Icon className="h-6 w-6 text-rose-500" />
                  </span>
                  <h2 className="mt-6 text-xl font-semibold text-neutral-900">{t(`${key}.title`)}</h2>
                  <p className="mt-2 flex-1 text-neutral-600">{t(`${key}.promise`)}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-neutral-900">
                    {tc("learnMore")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </span>
                </TransitionLink>
              </TiltCard>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand />
    </main>
  )
}
