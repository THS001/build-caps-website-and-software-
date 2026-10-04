import type { Metadata } from "next"
import { Quote } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getAgents } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { SectionHeader } from "@/components/site/section-header"
import { CtaBand } from "@/components/site/cta-band"
import { AgentCard } from "@/components/cards/agent-card"
import { TextScrub } from "@/components/motion/text-scrub"
import { CountUp } from "@/components/motion/count-up"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Reveal } from "@/components/reveal"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "about" })
  return pageMetadata({ locale, pathname: "/about", title: t("title"), description: t("intro") })
}

function Letter({ title, name, role, paragraphs }: { title: string; name: string; role: string; paragraphs: string[] }) {
  return (
    <Reveal className="rounded-[2rem] bg-sand-100/60 p-8 md:p-12">
      <Quote className="h-10 w-10 text-rose-300" />
      <h2 className="mt-6 text-2xl font-semibold text-neutral-900 md:text-3xl">{title}</h2>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-neutral-700">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="mt-8 font-semibold text-neutral-900">{name}</p>
      <p className="text-sm text-neutral-500">{role}</p>
    </Reveal>
  )
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("about")
  const tt = await getTranslations("team")
  const th = await getTranslations("home.proof")
  const agents = await getAgents()
  const values = t.raw("values.items") as { title: string; body: string }[]
  const leaders = agents.filter((a) => a.role === "ceo" || a.role === "salesDirector")

  return (
    <main id="main">
      <PageHero eyebrow={t("eyebrow")} title={t("title")} art="about" />

      <section className="container-custom py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <TextScrub text={t("intro")} className="text-2xl font-medium leading-snug text-neutral-900 md:text-4xl" />
          </div>
          <div className="lg:col-span-4">
            <p className="text-rose-metal text-7xl font-bold">
              <CountUp value={15} />+
            </p>
            <p className="mt-2 text-neutral-600">{th("years")}</p>
          </div>
        </div>
      </section>

      <section className="container-custom grid gap-6 pb-16 md:grid-cols-2">
        <div className="rounded-3xl bg-navy-900 p-8 text-white md:p-10">
          <p className="text-label text-rose-300">{t("mission.title")}</p>
          <p className="mt-4 text-2xl font-medium leading-snug">{t("mission.body")}</p>
        </div>
        <div className="rounded-3xl bg-navy-900 p-8 text-white md:p-10">
          <p className="text-label text-rose-300">{t("vision.title")}</p>
          <p className="mt-4 text-2xl font-medium leading-snug">{t("vision.body")}</p>
        </div>
      </section>

      <section className="container-custom pb-16 md:pb-24">
        <SectionHeader title={t("values.title")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <li key={v.title}>
              <Reveal delay={i * 0.06} className="h-full rounded-3xl p-7 ring-1 ring-neutral-200">
                <span className="text-rose-metal text-4xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-xl font-semibold text-neutral-900">{v.title}</h3>
                <p className="mt-2 text-neutral-600">{v.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-custom grid gap-6 pb-16 lg:grid-cols-2">
        <Letter title={t("ceo.title")} name={t("ceo.name")} role={t("ceo.role")} paragraphs={t.raw("ceo.letter") as string[]} />
        <Letter title={t("salesDirector.title")} name={t("salesDirector.name")} role={t("salesDirector.role")} paragraphs={t.raw("salesDirector.letter") as string[]} />
      </section>

      <section className="container-custom pb-8">
        <SectionHeader
          title={tt("title")}
          subtitle={tt("subtitle")}
          action={
            <TransitionLink href="/team" className="font-semibold text-neutral-900 hover:underline">
              {t("meetTeam")}
            </TransitionLink>
          }
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {leaders.map((a) => (
            <li key={a.slug}>
              <AgentCard agent={a} />
            </li>
          ))}
        </ul>
      </section>

      <CtaBand />
    </main>
  )
}
