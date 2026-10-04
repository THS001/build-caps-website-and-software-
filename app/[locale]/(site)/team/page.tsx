import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getAgents } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { EmptyNote } from "@/components/site/empty-note"
import { SampleNote } from "@/components/site/sample-note"
import { CtaBand } from "@/components/site/cta-band"
import { AgentCard } from "@/components/cards/agent-card"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "team" })
  return pageMetadata({ locale, pathname: "/team", title: t("title"), description: t("subtitle") })
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("team")
  const agents = await getAgents()
  // Advisors who speak the visitor's language come first.
  const sorted = [...agents].sort((a, b) => Number(b.languages.includes(locale)) - Number(a.languages.includes(locale)))

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="team" />
      <section className="container-custom py-14 md:py-20">
        <SampleNote className="mb-8" />
        {sorted.length === 0 && <EmptyNote topic="team" />}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((agent) => (
            <li key={agent.slug}>
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      </section>
      <CtaBand />
    </main>
  )
}
