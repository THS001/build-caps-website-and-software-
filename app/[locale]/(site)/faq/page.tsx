import type { Metadata } from "next"
import { MessageCircle } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { whatsappUrl } from "@/lib/site"
import { PageHero } from "@/components/site/page-hero"
import { FaqList } from "@/components/site/faq-list"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "faq" })
  return pageMetadata({ locale, pathname: "/faq", title: t("title"), description: t("subtitle") })
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("faq")
  const tc = await getTranslations("common")
  const tw = await getTranslations("whatsapp")

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="faq" />
      <section className="container-custom max-w-4xl py-14 md:py-20">
        <FaqList items={t.raw("items") as { q: string; a: string }[]} />
        <div className="mt-16 rounded-3xl bg-sand-100/70 p-8 text-center md:p-12">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("stillQuestions")}</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TransitionLink href="/book" className="rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white">
              {tc("bookCall")}
            </TransitionLink>
            <a href={whatsappUrl(tw("prefill"))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-neutral-900 ring-1 ring-neutral-300">
              <MessageCircle className="h-4 w-4" />
              {tc("whatsapp")}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
