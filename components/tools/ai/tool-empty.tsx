import { DatabaseZap } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { calculators } from "@/components/tools/registry"
import { EnquiryForm } from "@/components/site/enquiry-form"
import { TransitionLink } from "@/components/motion/view-transitions"

/**
 * Shown instead of a tool while the data it runs on (listings, communities,
 * DLD sales, off-plan projects) isn't published yet: the visitor can still hand
 * the question to an advisor, and the calculators work without any data.
 */
export async function ToolEmpty({ slug, interest = "buy" }: { slug: string; interest?: "buy" | "valuation" | "general" }) {
  const t = await getTranslations("intel.common")
  const tc = await getTranslations("tools.calculators")
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="rounded-3xl bg-navy-900 p-6 text-white md:p-8 lg:col-span-2">
        <DatabaseZap className="h-8 w-8 text-rose-300" />
        <h2 className="mt-5 text-2xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-3 leading-relaxed text-white/75">{t("emptyBody")}</p>
        <p className="mt-8 text-sm font-medium text-white/60">{t("emptyCalculators")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {calculators.map((c) => (
            <li key={c.slug}>
              <TransitionLink href={`/tools/${c.slug}`} className="inline-block rounded-full px-3.5 py-1.5 text-sm text-white ring-1 ring-white/25 hover:bg-white/10">
                {tc(`${c.key}.title`)}
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200 md:p-8 lg:col-span-3">
        <h3 className="text-lg font-semibold text-neutral-900">{t("emptyFormTitle")}</h3>
        <p className="mt-1 mb-5 text-sm text-neutral-600">{t("emptyFormBody")}</p>
        <EnquiryForm source={`tool:${slug}`} defaultInterest={interest} />
      </div>
    </div>
  )
}
