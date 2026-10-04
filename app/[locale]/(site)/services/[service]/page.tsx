import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { services } from "@/components/site/services"
import { PageHero } from "@/components/site/page-hero"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { EnquiryForm } from "@/components/site/enquiry-form"
import { CtaBand } from "@/components/site/cta-band"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Reveal } from "@/components/reveal"

type Props = { params: Promise<{ locale: Locale; service: string }> }

export function generateStaticParams() {
  return locales.flatMap((locale) => services.map((s) => ({ locale, service: s.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, service: slug } = await params
  const service = services.find((s) => s.slug === slug)
  if (!service) return {}
  const t = await getTranslations({ locale, namespace: "services" })
  return pageMetadata({ locale, pathname: `/services/${slug}`, title: t(`${service.key}.title`), description: t(`${service.key}.promise`) })
}

export default async function ServicePage({ params }: Props) {
  const { locale, service: slug } = await params
  setRequestLocale(locale)
  const service = services.find((s) => s.slug === slug)
  if (!service) notFound()

  const t = await getTranslations("services")
  const tc = await getTranslations("common")
  const steps = t.raw(`${service.key}.steps`) as { title: string; body: string }[]

  return (
    <main id="main">
      <PageHero eyebrow={t("title")} title={t(`${service.key}.title`)} subtitle={t(`${service.key}.promise`)} art={`service-${slug}`}>
        <TransitionLink href={`/book?purpose=${service.purpose}`} className="inline-flex rounded-full bg-white px-7 py-3.5 font-semibold text-neutral-900">
          {tc("bookCall")}
        </TransitionLink>
      </PageHero>

      <div className="container-custom pt-8">
        <Breadcrumbs items={[{ label: t("title"), href: "/services" }, { label: t(`${service.key}.title`), href: `/services/${slug}` }]} />
      </div>

      <section className="container-custom grid gap-12 py-14 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("howItWorks")}</h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 0.06} className="flex gap-5 rounded-3xl bg-sand-100/60 p-6">
                  <span className="text-rose-metal text-4xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{step.title}</h3>
                    <p className="mt-1 text-neutral-600">{step.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
        <aside className="lg:col-span-5">
          <div className="rounded-3xl p-6 ring-1 ring-neutral-200 lg:sticky lg:top-28">
            <p className="mb-4 text-lg font-semibold text-neutral-900">{t("enquire")}</p>
            <EnquiryForm source={`service:${slug}`} defaultInterest={service.interest} />
          </div>
        </aside>
      </section>

      <CtaBand bookQuery={`?purpose=${service.purpose}`} />
    </main>
  )
}
