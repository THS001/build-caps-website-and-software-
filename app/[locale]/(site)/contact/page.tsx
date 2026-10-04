import type { Metadata } from "next"
import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { site, whatsappUrl } from "@/lib/site"
import { PageHero } from "@/components/site/page-hero"
import { EnquiryForm } from "@/components/site/enquiry-form"
import { LazyPropertyMap } from "@/components/map/lazy-map"

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contact" })
  return pageMetadata({ locale, pathname: "/contact", title: t("title"), description: t("subtitle") })
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("contact")
  const tf = await getTranslations("footer")
  const tc = await getTranslations("common")
  const tw = await getTranslations("whatsapp")
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${site.geo.lat},${site.geo.lng}`

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="contact" />
      <section className="container-custom grid gap-10 py-14 md:py-20 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <a
            href={whatsappUrl(tw("prefill"))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-3xl bg-[#25D366]/10 p-6 ring-1 ring-[#25D366]/30 transition-colors hover:bg-[#25D366]/15"
          >
            <MessageCircle className="h-7 w-7 text-[#128C7E]" />
            <span>
              <span className="block font-semibold text-neutral-900">{tc("whatsapp")}</span>
              <bdi dir="ltr" className="text-sm text-neutral-600">
                +{site.whatsapp}
              </bdi>
            </span>
          </a>
          <div className="space-y-4 rounded-3xl p-6 ring-1 ring-neutral-200">
            {site.phones.map((p) => (
              <a key={p.href} href={p.href} className="flex items-center gap-3 text-neutral-800 hover:text-neutral-950">
                <Phone className="h-5 w-5 text-rose-500" />
                <bdi dir="ltr">{p.display}</bdi>
              </a>
            ))}
            <a href={`mailto:${site.email}`} className="flex items-center gap-3 text-neutral-800 hover:text-neutral-950">
              <Mail className="h-5 w-5 text-rose-500" />
              <bdi dir="ltr">{site.email}</bdi>
            </a>
            <p className="flex items-center gap-3 text-neutral-800">
              <Clock className="h-5 w-5 text-rose-500" />
              {tf("hours")}
            </p>
          </div>
          <div className="rounded-3xl p-6 ring-1 ring-neutral-200">
            <p className="flex items-start gap-3 font-semibold text-neutral-900">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              {t("visit")}
            </p>
            <p className="mt-2 ps-8 text-neutral-600">{tf("address")}</p>
            <div className="mt-5 h-64">
              <LazyPropertyMap label={t("visit")} className="h-full w-full" pins={[{ id: "office", lat: site.geo.lat, lng: site.geo.lng, label: "Buildcaps" }]} />
            </div>
            <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-neutral-900 hover:underline">
              <Navigation className="h-4 w-4" />
              {t("directions")}
            </a>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_-50px_rgb(0_23_63/0.4)] ring-1 ring-neutral-200 md:p-10">
            <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{t("form.title")}</h2>
            <EnquiryForm source="contact" defaultInterest="general" />
          </div>
        </div>
      </section>
    </main>
  )
}
