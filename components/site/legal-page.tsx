import { FileWarning } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { formatDate } from "@/lib/format"
import { site } from "@/lib/site"
import { PageHero } from "@/components/site/page-hero"

const LAST_UPDATED = "2026-10-03"

/** Privacy, terms and cookie pages share one layout; copy lives in messages under legal.{doc}.sections. */
export async function LegalPage({ doc }: { doc: "privacy" | "terms" | "cookies" }) {
  const t = await getTranslations("legal")
  const locale = (await getLocale()) as Locale
  const sections = t.raw(`${doc}.sections`) as { title: string; body: string }[]

  return (
    <main id="main">
      <PageHero title={t(`${doc}.title`)} subtitle={t("lastUpdated", { date: formatDate(LAST_UPDATED, locale, { dateStyle: "long" }) })} />
      <article className="container-custom max-w-3xl py-14 md:py-20">
        <p className="mb-12 flex items-start gap-3 rounded-2xl bg-sand-100 p-5 text-sm text-neutral-700">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          {t("reviewNotice")}
        </p>
        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold text-neutral-900">
                {i + 1}. {s.title}
              </h2>
              <p className="mt-3 leading-relaxed text-neutral-700">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-14 text-sm text-neutral-500">
          {t("contactLine", { company: site.legalName })}{" "}
          <a href={`mailto:${site.email}`} className="font-medium text-neutral-900 underline">
            {site.email}
          </a>
        </p>
      </article>
    </main>
  )
}
