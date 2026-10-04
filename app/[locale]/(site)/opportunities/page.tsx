import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getFunnels } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { FunnelCard } from "@/components/cards/funnel-card"
import { SampleNote } from "@/components/site/sample-note"
import { NewsletterForm } from "@/components/newsletter-form"
import { CtaBand } from "@/components/site/cta-band"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "opportunities" })
  return pageMetadata({ locale, pathname: "/opportunities", title: t("title"), description: t("subtitle") })
}

export default async function OpportunitiesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("opportunities")
  const funnels = await getFunnels(locale)

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="opportunities" />
      <section className="container-custom py-14 md:py-20">
        <SampleNote className="mb-8" />
        {funnels.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {funnels.map((f) => (
              <FunnelCard key={f.slug} funnel={f} source="opportunities" />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-3xl bg-sand-100 p-10 text-center">
            <p className="text-neutral-700">{t("empty")}</p>
            <NewsletterForm className="mt-6" />
          </div>
        )}
        <p className="mt-10 max-w-3xl text-xs text-neutral-500">{t("disclaimer")}</p>
      </section>
      <CtaBand />
    </main>
  )
}
