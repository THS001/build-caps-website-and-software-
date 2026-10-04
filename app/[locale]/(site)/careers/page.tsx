import type { Metadata } from "next"
import { ArrowRight, Briefcase, Globe2, LineChart, Sparkles } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { site } from "@/lib/site"
import { getJobs, localize } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { SectionHeader } from "@/components/site/section-header"
import { SampleNote } from "@/components/site/sample-note"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "careers" })
  return pageMetadata({ locale, pathname: "/careers", title: t("title"), description: t("subtitle") })
}

const whyIcons = [Globe2, Sparkles, LineChart]

export default async function CareersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("careers")
  const jobs = await getJobs()
  const reasons = t.raw("reasons") as { title: string; body: string }[]

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="careers" />

      <section className="container-custom py-16 md:py-20">
        <SectionHeader title={t("why")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {reasons.map((r, i) => {
            const Icon = whyIcons[i] ?? Briefcase
            return (
              <li key={r.title} className="rounded-3xl bg-sand-100/60 p-7">
                <Icon className="h-6 w-6 text-rose-500" />
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{r.title}</h3>
                <p className="mt-2 text-neutral-600">{r.body}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="container-custom pb-20">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-semibold text-neutral-900">{t("openRoles")}</h2>
          <SampleNote />
        </div>
        {jobs.length === 0 ? (
          <p className="text-neutral-600">{t("noRoles")}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {jobs.map((job) => (
              <li key={job.slug}>
                <TransitionLink href={`/careers/${job.slug}`} className="group flex flex-wrap items-center justify-between gap-4 py-6">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 group-hover:underline">{localize(job.title, locale)}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {job.location} · {localize(job.type, locale)}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </TransitionLink>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-neutral-600">
          {t("openApplication")}{" "}
          <a href={`mailto:${site.email}?subject=CV`} className="font-semibold text-neutral-900 underline">
            {site.email}
          </a>
        </p>
      </section>
    </main>
  )
}
