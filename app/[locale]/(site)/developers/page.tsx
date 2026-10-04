import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getDevelopers, getProjects, localize } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { EmptyNote } from "@/components/site/empty-note"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "developers" })
  return pageMetadata({ locale, pathname: "/developers", title: t("title"), description: t("subtitle") })
}

export default async function DevelopersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("developers")
  const [developers, projects] = await Promise.all([getDevelopers(), getProjects()])

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="developers" />
      <section className="container-custom py-14 md:py-20">
        <SampleNote className="mb-8" />
        {developers.length === 0 && <EmptyNote topic="developers" />}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {developers.map((d) => {
            const count = projects.filter((p) => p.developerSlug === d.slug).length
            return (
              <li key={d.slug}>
                <TransitionLink href={`/developers/${d.slug}`} className="group flex h-full flex-col rounded-3xl p-6 ring-1 ring-neutral-200 transition-shadow hover:shadow-[0_30px_80px_-40px_rgb(0_23_63/0.35)]">
                  <span className="text-rose-metal text-4xl font-bold">{d.name.slice(0, 1)}</span>
                  <h2 className="mt-6 text-xl font-semibold text-neutral-900 group-hover:underline">{d.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-neutral-600">{localize(d.summary, locale)}</p>
                  <p className="mt-4 text-sm font-medium text-neutral-900">{t("projects", { count })}</p>
                </TransitionLink>
              </li>
            )
          })}
        </ul>
      </section>
      <CtaBand />
    </main>
  )
}
