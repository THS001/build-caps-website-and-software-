import type { Metadata } from "next"
import { FileBarChart } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getReports, localize } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { EmptyNote } from "@/components/site/empty-note"
import { SampleNote } from "@/components/site/sample-note"
import { ReportRequest } from "@/components/site/report-request"
import { CtaBand } from "@/components/site/cta-band"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "reports" })
  return pageMetadata({ locale, pathname: "/market-reports", title: t("title"), description: t("subtitle") })
}

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("reports")
  const reports = await getReports()

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="reports" />
      <section className="container-custom py-14 md:py-20">
        <SampleNote className="mb-8" />
        {reports.length === 0 && <EmptyNote topic="reports" />}
        <ul className="grid gap-6 lg:grid-cols-2">
          {reports.map((r) => (
            <li key={r.slug} className="rounded-3xl p-7 ring-1 ring-neutral-200 md:p-9">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50">
                  <FileBarChart className="h-6 w-6 text-rose-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-rose-700">{r.quarter}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{localize(r.title, locale)}</h2>
                  <p className="mt-2 text-neutral-600">{localize(r.summary, locale)}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="mb-3 text-sm text-neutral-500">{t("gateBody")}</p>
                <ReportRequest slug={r.slug} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand />
    </main>
  )
}
