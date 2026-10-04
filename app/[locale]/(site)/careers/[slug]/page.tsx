import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { site } from "@/lib/site"
import { getJob, getJobs, localize } from "@/lib/data"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { JsonLd } from "@/components/site/json-ld"
import { SampleNote } from "@/components/site/sample-note"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const jobs = await getJobs()
  return locales.flatMap((locale) => jobs.map((j) => ({ locale, slug: j.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const job = await getJob(slug)
  if (!job) return {}
  return pageMetadata({ locale, pathname: `/careers/${slug}`, title: localize(job.title, locale), description: localize(job.summary, locale) })
}

export default async function JobPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const job = await getJob(slug)
  if (!job) notFound()
  const t = await getTranslations("careers")
  const title = localize(job.title, locale)

  return (
    <main id="main" className="pt-24 md:pt-28">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title,
          description: localize(job.summary, locale),
          hiringOrganization: { "@type": "Organization", name: site.legalName, sameAs: site.url },
          jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" } },
          employmentType: "FULL_TIME",
        }}
      />
      <div className="container-custom max-w-3xl pb-24">
        <Breadcrumbs items={[{ label: t("title"), href: "/careers" }, { label: title, href: `/careers/${slug}` }]} />
        <h1 className="mt-8 text-4xl font-semibold text-neutral-900 md:text-5xl">{title}</h1>
        <p className="mt-3 text-neutral-500">
          {job.location} · {localize(job.type, locale)}
        </p>
        <SampleNote className="mt-4" />
        <p className="mt-8 text-lg leading-relaxed text-neutral-700">{localize(job.summary, locale)}</p>
        <h2 className="mt-12 text-2xl font-semibold text-neutral-900">{t("requirements")}</h2>
        <ul className="mt-5 space-y-3">
          {job.requirements.map((r) => (
            <li key={r.en} className="flex gap-3 text-neutral-700">
              <Check className="mt-1 h-4 w-4 shrink-0 text-rose-500" />
              {localize(r, locale)}
            </li>
          ))}
        </ul>
        <a
          href={`mailto:${site.email}?subject=${encodeURIComponent(title)}`}
          className="glow-rose mt-12 inline-flex rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white"
        >
          {t("apply")}
        </a>
      </div>
    </main>
  )
}
