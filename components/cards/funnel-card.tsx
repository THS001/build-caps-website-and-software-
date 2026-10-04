import { ArrowUpRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { localize } from "@/lib/data/shared"
import type { Funnel } from "@/lib/data/types"
import { formatDate } from "@/lib/format"
import Image from "next/image"
import { Photo } from "@/components/media/photo"
import { seededPhoto } from "@/lib/media"
import { FlipCard } from "@/components/motion/flip-card"

/**
 * Opportunity card. Both faces link through /go/[slug], which logs the click and
 * forwards to the external briefing with UTM tags. Plain <a>: it leaves the app.
 */
export function FunnelCard({ funnel: f, source }: { funnel: Funnel; source: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("opportunities")
  const href = `/go/${f.slug}?src=${encodeURIComponent(source)}&lang=${locale}`

  return (
    <FlipCard
      label={t("keyNumber")}
      className="aspect-[3/4] rounded-3xl"
      front={
        <a href={href} className="relative block h-full overflow-hidden rounded-3xl">
          {f.imageUrl ? (
            <Image src={f.imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          ) : (
            <Photo photo={seededPhoto(f.slug, ["marinaBoats", "burjSunset", "palmAerial", "creekSunset", "businessBay", "villaPool"])} sizes="(min-width: 1024px) 25vw, 50vw" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/30 to-transparent" />
          <span className="badge-shimmer absolute start-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
            {localize(f.tag, locale)}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <h3 className="text-2xl font-semibold leading-snug">{localize(f.title, locale)}</h3>
            {f.endsAt && <p className="mt-2 text-sm text-white/70">{t("endsOn", { date: formatDate(f.endsAt, locale) })}</p>}
          </div>
        </a>
      }
      back={
        <a href={href} className="flex h-full flex-col justify-between rounded-3xl bg-navy-900 p-6 text-white ring-1 ring-white/10">
          <p className="text-label text-rose-300">{localize(f.keyNumber.label, locale)}</p>
          <div>
            <p className="text-rose-metal text-5xl font-bold">{f.keyNumber.value}</p>
            <p className="mt-4 text-white/80">{localize(f.pitch, locale)}</p>
          </div>
          <span className="flex items-center gap-2 font-semibold text-rose-200">
            {t("open")}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
          </span>
        </a>
      }
    />
  )
}
