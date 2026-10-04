import type { ReactNode } from "react"
import { Photo } from "@/components/media/photo"
import { photos, seededPhoto, type PhotoKey } from "@/lib/media"
import { cn } from "@/lib/utils"

type PageHeroProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Background photo for the page (a key below, or any seed); omit for a plain aurora header. */
  art?: string
  children?: ReactNode
  className?: string
}

// Each page's header photo (licensed stock, see lib/media.ts).
const PAGE_PHOTOS: Record<string, PhotoKey> = {
  about: "sheikhZayed",
  awards: "burjSunset",
  careers: "office",
  communities: "palmAerial",
  contact: "greenLawn",
  developers: "construction",
  faq: "villaPool",
  insights: "marinaNight",
  invest: "burjSunset",
  "off-plan": "burjCrane",
  opportunities: "marinaBoats",
  properties: "neighbourhood",
  reports: "businessBay",
  services: "modernVilla",
  team: "creekSunset",
  tools: "downtownDusk",
  "service-buy": "modernVilla",
  "service-sell": "townhouses",
  "service-rent": "livingRoom",
  "service-property-management": "greenLawn",
  "service-mortgage": "office",
  "service-valuation": "neighbourhood",
}

/** Header block for inner pages: eyebrow, H1, standfirst, optional actions, optional photo. */
export function PageHero({ eyebrow, title, subtitle, art, children, className }: PageHeroProps) {
  const photo = art ? (PAGE_PHOTOS[art] ? photos[PAGE_PHOTOS[art]] : seededPhoto(art)) : null
  return (
    <header className={cn("relative overflow-hidden", photo ? "bg-navy-900 text-white" : "bg-aurora", className)}>
      {photo && (
        <>
          <div className="absolute inset-0 motion-safe:animate-[kenburns_16s_ease-out_forwards]">
            <Photo photo={photo} priority sizes="100vw" quality={70} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/55 to-navy-900/35" />
        </>
      )}
      <div className="container-custom relative pt-32 pb-14 md:pt-40 md:pb-20">
        {eyebrow && <p className={cn("text-label mb-4", photo ? "text-white/75" : "text-rose-700")}>{eyebrow}</p>}
        <h1 className={cn("max-w-4xl text-4xl font-semibold leading-tight md:text-6xl", photo ? "text-white" : "text-neutral-900")}>{title}</h1>
        {subtitle && <p className={cn("mt-5 max-w-2xl text-lg leading-relaxed", photo ? "text-white/80" : "text-neutral-600")}>{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  )
}
