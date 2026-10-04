import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { calculators } from "@/components/tools/registry"
import { aiTools } from "@/components/tools/ai-registry"
import { CalculatorView } from "@/components/tools/calculators"
import { AiToolBody } from "@/components/tools/ai/tool-body"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"
import { SampleNote } from "@/components/site/sample-note"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale; tool: string }> }

export function generateStaticParams() {
  return locales.flatMap((locale) => [...calculators, ...aiTools].map((c) => ({ locale, tool: c.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, tool } = await params
  const t = await getTranslations({ locale, namespace: "tools" })
  const calc = calculators.find((c) => c.slug === tool)
  const ai = aiTools.find((c) => c.slug === tool)
  if (calc) return pageMetadata({ locale, pathname: `/tools/${tool}`, title: t(`calculators.${calc.key}.title`), description: t(`calculators.${calc.key}.body`) })
  if (ai) return pageMetadata({ locale, pathname: `/tools/${tool}`, title: t(`aiTools.${ai.key}.title`), description: t(`aiTools.${ai.key}.body`) })
  return {}
}

const bookPurpose: Record<string, string> = { mortgage: "mortgage", "golden-visa": "goldenVisa", estimate: "valuation" }

export default async function ToolPage({ params }: Props) {
  const { locale, tool } = await params
  setRequestLocale(locale)
  const calc = calculators.find((c) => c.slug === tool)
  const ai = aiTools.find((c) => c.slug === tool)
  if (!calc && !ai) notFound()

  const t = await getTranslations("tools")
  const tn = await getTranslations("nav")
  const Icon = (calc ?? ai)!.icon
  const title = calc ? t(`calculators.${calc.key}.title`) : t(`aiTools.${ai!.key}.title`)
  const body = calc ? t(`calculators.${calc.key}.body`) : t(`aiTools.${ai!.key}.body`)
  const siblings = calc ? calculators.filter((c) => c.slug !== tool).map((c) => ({ slug: c.slug, title: t(`calculators.${c.key}.title`) })) : aiTools.filter((c) => c.slug !== tool).map((c) => ({ slug: c.slug, title: t(`aiTools.${c.key}.title`) }))

  return (
    <main id="main" className="pt-24 md:pt-28">
      <div className="container-custom">
        <Breadcrumbs items={[{ label: tn("tools"), href: "/tools" }, { label: title, href: `/tools/${tool}` }]} />
        <header className="mt-8 mb-10 flex items-start gap-5">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 sm:flex">
            <Icon className="h-7 w-7 text-rose-500" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold text-neutral-900 md:text-5xl">{title}</h1>
              {ai && ai.status !== "live" && <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-neutral-700">{t(`status.${ai.status}`)}</span>}
            </div>
            <p className="mt-3 max-w-2xl text-lg text-neutral-600">{body}</p>
            {ai && <SampleNote className="mt-4" />}
          </div>
        </header>

        {calc ? <CalculatorView calculator={calc.key} /> : <AiToolBody tool={ai!.key} locale={locale} />}

        <nav aria-label={calc ? t("groups.calculators") : t("groups.ai")} className="mt-12 flex flex-wrap gap-2">
          {siblings.map((c) => (
            <TransitionLink key={c.slug} href={`/tools/${c.slug}`} className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:border-rose-300">
              {c.title}
            </TransitionLink>
          ))}
        </nav>
      </div>
      <SeoExtras locale={locale} pathname={`/tools/${tool}`} />
      <CtaBand bookQuery={bookPurpose[tool] ? `?purpose=${bookPurpose[tool]}` : ""} />
    </main>
  )
}
