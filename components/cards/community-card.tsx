import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import type { Community } from "@/lib/data"
import { formatNumber, formatPercent } from "@/lib/format"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { TransitionLink } from "@/components/motion/view-transitions"
import { cn } from "@/lib/utils"

export function CommunityCard({ community: c, className }: { community: Community; className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("home.communities")

  return (
    <TransitionLink href={`/communities/${c.slug}`} className={cn("group relative block aspect-[4/5] overflow-hidden rounded-3xl", className)}>
      <div className="absolute inset-0" style={{ viewTransitionName: `community-${c.slug}` }}>
        <Photo photo={areaPhoto(c.slug)} sizes="(min-width: 640px) 340px, 72vw" className="transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-6 text-white">
        <h3 className="text-2xl font-semibold">{c.name}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">{t("yield", { value: formatPercent(c.estYield, locale) })}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">{t("avgPrice", { value: formatNumber(c.avgPricePerSqft, locale) })}</span>
        </div>
      </div>
    </TransitionLink>
  )
}
