import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BadgeCheck, Bath, BedDouble, Building2, CalendarClock, Languages, MapPin, QrCode, Ruler, Sofa, Sparkles } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { pageMetadata, localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import {
  getAgent,
  getCommunity,
  getDeveloper,
  getNameMaps,
  getProperties,
  getProperty,
  getSimilarProperties,
  isGoldenVisaEligible,
  localize,
} from "@/lib/data"
import { formatDate, formatMoney, formatNumber, formatPercent, quarterParts } from "@/lib/format"
import Image from "next/image"
import { Photo } from "@/components/media/photo"
import { areaPhoto } from "@/lib/media"
import { Area, Price } from "@/components/price"
import { PaymentPlanBar } from "@/components/property/payment-plan"
import { PropertyCard } from "@/components/property/property-card"
import { PropertyIntelligence } from "@/components/property/intelligence"
import { VoiceNote } from "@/components/property/voice-note"
import { LivingHere } from "@/components/property/living-here"
import { StyleMoodboard } from "@/components/property/style-moodboard"
import { aiConfigured } from "@/lib/ai/client"
import { AgentAvatar } from "@/components/cards/agent-card"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { EnquiryForm } from "@/components/site/enquiry-form"
import { JsonLd } from "@/components/site/json-ld"
import { SampleNote } from "@/components/site/sample-note"
import { SeoExtras } from "@/components/site/seo-extras"
import { LazyPropertyMap } from "@/components/map/lazy-map"
import { TransitionLink } from "@/components/motion/view-transitions"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

// Registration and trustee fees on top of the 4% DLD transfer fee (typical, AED, VAT included).
const REGISTRATION_FEES = 4_200
const DLD_FEE = 0.04

export async function generateStaticParams() {
  const all = await getProperties()
  return locales.flatMap((locale) => all.map((p) => ({ locale, slug: p.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const property = await getProperty(slug)
  if (!property) return {}
  return pageMetadata({
    locale,
    pathname: `/properties/${slug}`,
    title: localize(property.title, locale),
    description: localize(property.description, locale),
    image: property.images[0]?.src,
  })
}

export default async function PropertyPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const property = await getProperty(slug)
  if (!property) notFound()

  const [community, developer, agent, similar, names] = await Promise.all([
    getCommunity(property.communitySlug),
    getDeveloper(property.developerSlug),
    getAgent(property.agentSlug),
    getSimilarProperties(property),
    getNameMaps(),
  ])
  const t = await getTranslations("property")
  const tc = await getTranslations("common")
  const tn = await getTranslations("nav")
  const tt = await getTranslations("team")

  const title = localize(property.title, locale)
  const price = property.priceAed
  const estRent = price && property.estYield ? price * property.estYield : null
  const totalCost = price ? price * (1 + DLD_FEE) + REGISTRATION_FEES : null
  const goldenVisa = isGoldenVisaEligible(property)
  const handover = property.handover ? tc("quarter", quarterParts(property.handover, locale)) : tc("status.ready")
  const waterfront = community?.waterfront ?? false

  const facts = [
    { icon: Building2, label: t("type"), value: tc(`types.${property.type}`) },
    { icon: BedDouble, label: t("bedrooms"), value: tc("beds", { count: property.beds }) },
    { icon: Bath, label: t("bathrooms"), value: tc("baths", { count: property.baths }) },
    { icon: Ruler, label: t("size"), value: <Area sqft={property.sqft} /> },
    { icon: CalendarClock, label: t("handover"), value: handover },
    { icon: Sofa, label: t("furnishing"), value: property.furnishing ? t(`furnishingOptions.${property.furnishing}`) : "—" },
  ]

  return (
    <main id="main" className="pt-24 md:pt-28">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: title,
          description: localize(property.description, locale),
          url: new URL(localizedPath(`/properties/${slug}`, locale), site.url).toString(),
          datePosted: property.publishedAt,
          offers: price ? { "@type": "Offer", price, priceCurrency: "AED", availability: "https://schema.org/InStock" } : undefined,
          about: {
            "@type": "Accommodation",
            numberOfBedrooms: property.beds,
            numberOfBathroomsTotal: property.baths,
            floorSize: { "@type": "QuantitativeValue", value: property.sqft, unitCode: "FTK" },
            address: { "@type": "PostalAddress", addressLocality: community?.name, addressRegion: "Dubai", addressCountry: "AE" },
            geo: { "@type": "GeoCoordinates", latitude: property.geo.lat, longitude: property.geo.lng },
          },
        }}
      />

      <div className="container-custom">
        <Breadcrumbs
          items={[
            { label: tn("properties"), href: "/properties" },
            ...(community ? [{ label: community.name, href: `/communities/${community.slug}` }] : []),
            { label: title, href: `/properties/${slug}` },
          ]}
        />

        {/* Gallery */}
        <div className="mt-6 grid gap-3 md:grid-cols-4 md:grid-rows-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl md:col-span-3 md:row-span-2 md:aspect-auto" style={{ viewTransitionName: `property-${slug}` }}>
            {property.images[0] ? (
              <Image src={property.images[0].src} alt={localize(property.images[0].alt, locale) || title} fill priority sizes="(min-width: 768px) 75vw, 100vw" className="object-cover" />
            ) : (
              <>
                <Photo photo={areaPhoto(property.communitySlug)} priority sizes="(min-width: 768px) 75vw, 100vw" />
                <span className="absolute bottom-4 end-4 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">{tc("areaPhoto")}</span>
              </>
            )}
            <div className="absolute start-4 top-4 flex gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">{tc(`status.${property.status}`)}</span>
              {property.badge && <span className="badge-shimmer rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">{tc(`status.${property.badge}`)}</span>}
              {property.verifiedAt && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {tc("verified", { date: formatDate(property.verifiedAt, locale) })}
                </span>
              )}
            </div>
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="relative hidden overflow-hidden rounded-3xl md:block">
              {property.images[i] ? (
                <Image src={property.images[i].src} alt={localize(property.images[i].alt, locale)} fill sizes="25vw" className="object-cover" />
              ) : (
                <Photo photo={areaPhoto(i === 1 ? `${property.communitySlug}-alt` : "neighbourhood")} sizes="25vw" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          {/* Main column */}
          <div className="space-y-14 lg:col-span-8">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                <MapPin className="h-4 w-4 text-rose-500" />
                {community?.name}
                {developer && ` · ${developer.name}`}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-neutral-900 md:text-5xl">{title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-neutral-600">{localize(property.description, locale)}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {property.keywords.map((k) => (
                  <li key={k} className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-rose-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t(`keywordList.${k}`)}
                  </li>
                ))}
              </ul>
            </div>

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("keyFacts")}</h2>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-neutral-200 ring-1 ring-neutral-200 sm:grid-cols-3">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white p-5">
                    <dt className="flex items-center gap-2 text-xs text-neutral-500">
                      <Icon className="h-4 w-4 text-rose-500" />
                      {label}
                    </dt>
                    <dd className="mt-2 font-semibold text-neutral-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {property.paymentPlan && (
              <section>
                <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("paymentPlan.title")}</h2>
                <PaymentPlanBar plan={property.paymentPlan} />
                {price && (
                  <p className="mt-5 text-sm text-neutral-600">
                    {t("paymentPlan.example", {
                      price: formatMoney(price, "AED", locale),
                      amount: formatMoney((price * property.paymentPlan.onBooking) / 100, "AED", locale),
                    })}
                  </p>
                )}
              </section>
            )}

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("numbers.title")}</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {property.estYield && (
                  <div className="rounded-3xl bg-sand-100/70 p-6">
                    <dt className="text-sm text-neutral-500">{t("numbers.estYield")}</dt>
                    <dd className="text-rose-metal mt-2 text-4xl font-bold">{formatPercent(property.estYield, locale)}</dd>
                  </div>
                )}
                {estRent && (
                  <div className="rounded-3xl bg-sand-100/70 p-6">
                    <dt className="text-sm text-neutral-500">{t("numbers.estRent")}</dt>
                    <dd className="mt-2 text-2xl font-semibold text-neutral-900">
                      <Price aed={Math.round(estRent / 1000) * 1000} />
                    </dd>
                  </div>
                )}
                {price && (
                  <div className="rounded-3xl bg-sand-100/70 p-6">
                    <dt className="text-sm text-neutral-500">{t("numbers.dldFee")}</dt>
                    <dd className="mt-2 text-2xl font-semibold text-neutral-900">
                      <Price aed={price * DLD_FEE} />
                    </dd>
                  </div>
                )}
                {totalCost && (
                  <div className="rounded-3xl bg-sand-100/70 p-6">
                    <dt className="text-sm text-neutral-500">{t("numbers.totalCost")}</dt>
                    <dd className="mt-2 text-2xl font-semibold text-neutral-900">
                      <Price aed={totalCost} />
                    </dd>
                  </div>
                )}
              </dl>
              {goldenVisa && (
                <p className="mt-4 flex items-center gap-2 font-medium text-neutral-900">
                  <BadgeCheck className="h-5 w-5 text-rose-500" />
                  {t("numbers.goldenVisa")}
                </p>
              )}
              <p className="mt-4 text-xs text-neutral-500">
                {t("numbers.basis", { community: community?.name ?? "" })} {tc("notFinancialAdvice")}
              </p>
              <SampleNote className="mt-3" />
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("intelligence")}</h2>
              <PropertyIntelligence property={property} locale={locale} />
            </section>

            {aiConfigured && (
              <section>
                <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("moodboard.title")}</h2>
                <StyleMoodboard slug={slug} />
              </section>
            )}

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("amenities")}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {t(`amenityList.${a}`)}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("location")}</h2>
              <div className="h-80">
                <LazyPropertyMap label={t("location")} className="h-full w-full" pins={[{ id: slug, lat: property.geo.lat, lng: property.geo.lng, label: community?.name ?? title }]} />
              </div>
              {community && <p className="mt-4 text-neutral-600">{localize(community.lifestyle, locale)}</p>}
              <LivingHere property={property} />
            </section>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-50px_rgb(0_23_63/0.45)] ring-1 ring-neutral-200">
                <p className="text-sm text-neutral-500">{t("price")}</p>
                <p className="mt-1 text-3xl font-bold text-neutral-900">
                  <Price aed={price} compact={false} approxClassName="block ms-0 mt-1 text-base" />
                </p>
                {price && <p className="mt-2 text-sm text-neutral-500">{t("pricePerSqft", { value: formatNumber(price / property.sqft, locale) })}</p>}
                <TransitionLink
                  href={`/book?purpose=viewing&property=${slug}`}
                  className="glow-rose mt-6 flex h-12 items-center justify-center rounded-xl bg-neutral-900 font-semibold text-white"
                >
                  {tc("bookViewing")}
                </TransitionLink>
              </div>

              {agent && (
                <div className="rounded-3xl bg-sand-100/70 p-6">
                  <p className="text-label text-rose-700">{t("advisor.title")}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <AgentAvatar agent={agent} className="h-14 w-14" />
                    <div>
                      <TransitionLink href={`/team/${agent.slug}`} className="font-semibold text-neutral-900 hover:underline">
                        {agent.name}
                      </TransitionLink>
                      <p className="text-sm text-neutral-500">{tt(`roles.${agent.role}`)}</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    {t("advisor.speaks", { languages: agent.languages.map((l) => localeNames[l]).join(", ") })}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">{t("advisor.responds", { time: tc(`durations.${agent.respondsWithin}`) })}</p>
                  {aiConfigured && <VoiceNote slug={slug} advisor={agent.name} />}
                </div>
              )}

              <div className="rounded-3xl p-6 ring-1 ring-neutral-200">
                <p className="flex items-center gap-2 font-semibold text-neutral-900">
                  <QrCode className="h-5 w-5 text-rose-500" />
                  {t("compliance.title")}
                </p>
                <p className="mt-2 text-sm text-neutral-600">{t("compliance.body")}</p>
                <p className="mt-3 font-mono text-sm text-neutral-900">{tc("permit", { number: property.permit })}</p>
              </div>

              <div className="rounded-3xl p-6 ring-1 ring-neutral-200">
                <p className="mb-4 font-semibold text-neutral-900">{t("enquire")}</p>
                <EnquiryForm source={`property:${slug}`} defaultMessage={t("enquiryPrefill", { property: title })} />
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="py-20">
            <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("similar")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((p) => (
                <PropertyCard key={p.slug} property={p} communityName={names.communities[p.communitySlug]} developerName={names.developers[p.developerSlug]} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SeoExtras locale={locale} pathname={`/properties/${slug}`} />
    </main>
  )
}
