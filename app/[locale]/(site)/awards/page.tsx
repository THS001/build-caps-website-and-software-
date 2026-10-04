import type { Metadata } from "next"
import { Award } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { PageHero } from "@/components/site/page-hero"
import { CtaBand } from "@/components/site/cta-band"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "awards" })
  return pageMetadata({ locale, pathname: "/awards", title: t("title"), description: t("subtitle") })
}

// The awards list comes from the client (WORKFLOW.md "Content needed"); until then the page says so honestly.
export default async function AwardsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("awards")

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="awards" />
      <section className="container-custom py-16 md:py-24">
        <div className="mx-auto max-w-xl rounded-3xl bg-sand-100/70 p-10 text-center">
          <Award className="mx-auto h-10 w-10 text-rose-500" />
          <p className="mt-6 text-lg text-neutral-700">{t("pending")}</p>
        </div>
      </section>
      <CtaBand />
    </main>
  )
}
