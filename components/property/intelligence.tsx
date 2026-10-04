import { ArrowRight, Eye, Ghost, LineChart, ShieldCheck, Sun, Telescope } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import type { Property } from "@/lib/data/types"
import { getDeveloper, getProject, getProjectProgress } from "@/lib/data"
import { estimateValue } from "@/lib/market/estimate"
import { handoverScore } from "@/lib/insights/handover"
import { formatMoney, formatNumber } from "@/lib/format"
import { TransitionLink } from "@/components/motion/view-transitions"

/** Buildcaps Intelligence on a listing: DLD estimate, Handover Truth Score and links into the tools, prefilled. */
export async function PropertyIntelligence({ property, locale }: { property: Property; locale: Locale }) {
  const t = await getTranslations("ai")
  const tt = await getTranslations("tools.aiTools")
  const [estimate, project] = await Promise.all([
    property.listing === "sale" ? estimateValue({ community: property.communitySlug, beds: property.beds, sqft: property.sqft }) : Promise.resolve(null),
    property.status === "offPlan" && property.projectSlug ? getProject(property.projectSlug) : Promise.resolve(null),
  ])
  const handover = project ? handoverScore(project, (await getDeveloper(project.developerSlug)) ?? null, await getProjectProgress(project.slug)) : null
  const q = `property=${property.slug}`
  const links = [
    { key: "wealthTwin", href: `/tools/wealth-twin?${q}`, icon: Telescope, show: property.listing === "sale" },
    { key: "ghostTenant", href: `/tools/ghost-tenant?${q}`, icon: Ghost, show: true },
    { key: "futureView", href: `/tools/future-view?${q}`, icon: Eye, show: true },
    { key: "dayInYourLife", href: `/tools/day-in-your-life?${q}`, icon: Sun, show: true },
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {property.listing === "sale" && (
          <div className="rounded-3xl bg-navy-900 p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-300">
              <LineChart className="h-4 w-4" /> {t("panels.estimate")}
            </p>
            {estimate ? (
              <>
                <p className="mt-3 text-2xl font-bold">
                  <bdi>{t("panels.estimateRange", { low: formatMoney(estimate.low, "AED", locale), high: formatMoney(estimate.high, "AED", locale) })}</bdi>
                </p>
                <p className="mt-2 text-sm text-white/70">{t("panels.comparables", { count: formatNumber(estimate.sales, locale) })}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/70">{tt("estimate.body")}</p>
            )}
            <TransitionLink href={`/tools/estimate?community=${property.communitySlug}&beds=${property.beds}&sqft=${property.sqft}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
              {estimate ? t("panels.details") : t("panels.tryEstimate")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </TransitionLink>
          </div>
        )}
        {handover && (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
              <ShieldCheck className="h-4 w-4" /> {t("panels.handover")}
            </p>
            <p className="mt-3 text-2xl font-bold text-neutral-900">{t("panels.handoverValue", { value: Math.round(handover.probability * 100) })}</p>
            <p className="mt-2 text-sm text-neutral-500">{t("panels.handoverBasis")}</p>
            <TransitionLink href="/tools/handover-score" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
              {t("panels.details")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </TransitionLink>
          </div>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links
          .filter((l) => l.show)
          .map(({ key, href, icon: Icon }) => (
            <li key={key}>
              <TransitionLink href={href} className="group flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-neutral-200 hover:ring-rose-300">
                <Icon className="h-5 w-5 shrink-0 text-rose-500" />
                <span className="flex-1">
                  <span className="block font-medium text-neutral-900">{tt(`${key}.title`)}</span>
                  <span className="block text-xs text-neutral-500">{t(`panels.links.${key}`)}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </TransitionLink>
            </li>
          ))}
      </ul>
      <p className="text-xs text-neutral-500">{t("disclaimer")}</p>
    </div>
  )
}
