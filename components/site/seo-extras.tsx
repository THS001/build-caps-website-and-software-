import { getTranslations } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { getSeoOverride } from "@/lib/seo-agent/overrides"
import { JsonLd } from "@/components/site/json-ld"
import { TransitionLink } from "@/components/motion/view-transitions"

/**
 * FAQ and related links the SEO Growth Agent added to this page (after approval
 * or as a low-risk change). Renders nothing until there are any.
 */
export async function SeoExtras({ locale, pathname }: { locale: Locale; pathname: string }) {
  const override = await getSeoOverride(locale, pathname)
  const faq = override?.faq?.filter((f) => f.q && f.a) ?? []
  const links = override?.links?.filter((l) => l.href.startsWith("/") && l.label) ?? []
  if (!faq.length && !links.length) return null
  const t = await getTranslations("common")

  return (
    <section className="container-custom pb-14 md:pb-20">
      {faq.length > 0 && (
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("faqTitle")}</h2>
          <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
            {faq.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-semibold text-neutral-900">{f.q}</dt>
                <dd className="mt-2 leading-relaxed text-neutral-600">{f.a}</dd>
              </div>
            ))}
          </dl>
          <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
        </div>
      )}
      {links.length > 0 && (
        <nav aria-label={t("relatedTitle")} className="mt-10">
          <h2 className="text-label text-neutral-500">{t("relatedTitle")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.href}>
                <TransitionLink href={l.href} className="inline-block rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:border-rose-300">
                  {l.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  )
}
