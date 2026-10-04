import Image from "next/image"
import { BadgeCheck, BedDouble, Bath, MapPin } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { localize } from "@/lib/data/shared"
import type { Property } from "@/lib/data/types"
import { formatPercent, quarterParts } from "@/lib/format"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { TiltCard } from "@/components/motion/tilt-card"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Area, Price } from "@/components/price"
import { cn } from "@/lib/utils"

type PropertyCardProps = {
  property: Property
  communityName: string
  developerName?: string
  priority?: boolean
  className?: string
}

/** Listing card. Works in server and client trees (no "use client"): it only uses next-intl hooks. */
export function PropertyCard({ property: p, communityName, developerName, priority, className }: PropertyCardProps) {
  const locale = useLocale() as Locale
  const t = useTranslations("common")
  const title = localize(p.title, locale)
  const cover = p.images[0]

  return (
    <TiltCard max={5} className={cn("rounded-3xl", className)}>
      <TransitionLink
        href={`/properties/${p.slug}`}
        className="group block overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200 transition-shadow hover:shadow-[0_30px_80px_-40px_rgb(0_23_63/0.45)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden" style={{ viewTransitionName: `property-${p.slug}` }}>
          {cover ? (
            <Image src={cover.src} alt={localize(cover.alt, locale)} fill priority={priority} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            // No photos yet: the area's photo, labelled so it is never mistaken for the unit.
            <>
              <Photo photo={areaPhoto(p.communitySlug)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute bottom-3 end-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white backdrop-blur">{t("areaPhoto")}</span>
            </>
          )}
          <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-900 backdrop-blur">
              {t(`status.${p.status}`)}
            </span>
            {p.verifiedAt && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("verifiedShort")}
              </span>
            )}
            {p.badge && (
              <span className="badge-shimmer rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white">
                {t(`status.${p.badge}`)}
              </span>
            )}
          </div>
          {p.estYield && (
            <span className="absolute end-3 bottom-3 rounded-full bg-navy-900/85 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {t("estYield", { value: formatPercent(p.estYield, locale) })}
            </span>
          )}
        </div>

        <div className="space-y-3 p-5">
          <div>
            <p className="text-xl font-semibold text-neutral-900">
              <Price aed={p.priceAed} />
            </p>
            <h3 className="mt-1 line-clamp-2 font-medium text-neutral-800">{title}</h3>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span className="truncate">
              {communityName}
              {developerName && ` · ${developerName}`}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-neutral-400" />
              {t("beds", { count: p.beds })}
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-neutral-400" />
              {t("baths", { count: p.baths })}
            </span>
            <Area sqft={p.sqft} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span>{p.handover ? t("handover", { quarter: t("quarter", quarterParts(p.handover, locale)) }) : t("status.ready")}</span>
            <span>{t("permit", { number: p.permit })}</span>
          </div>
        </div>
      </TransitionLink>
    </TiltCard>
  )
}
