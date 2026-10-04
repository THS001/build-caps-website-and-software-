import Image from "next/image"
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { site, whatsappUrl } from "@/lib/site"
import { ConsentSettingsButton } from "@/components/site/consent-banner"
import { NewsletterForm } from "@/components/newsletter-form"

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const socialIcons = { Instagram, LinkedIn: Linkedin, Facebook, X: XLogo } as const

const columns = [
  {
    title: "explore",
    links: [
      { href: "/properties", key: "properties" },
      { href: "/off-plan", key: "offPlan" },
      { href: "/opportunities", key: "opportunities" },
      { href: "/communities", key: "communities" },
      { href: "/developers", key: "developers" },
      { href: "/tools", key: "tools" },
    ],
  },
  {
    title: "services",
    links: [
      { href: "/services/buy", key: "servicesMenu.buy" },
      { href: "/services/sell", key: "servicesMenu.sell" },
      { href: "/services/rent", key: "servicesMenu.rent" },
      { href: "/services/property-management", key: "servicesMenu.propertyManagement" },
      { href: "/services/mortgage", key: "servicesMenu.mortgage" },
      { href: "/services/valuation", key: "servicesMenu.valuation" },
    ],
  },
  {
    title: "company",
    links: [
      { href: "/about", key: "about" },
      { href: "/team", key: "team" },
      { href: "/awards", key: "awards" },
      { href: "/careers", key: "careers" },
      { href: "/insights", key: "insights" },
      { href: "/market-reports", key: "reports" },
      { href: "/faq", key: "faq" },
      { href: "/contact", key: "contact" },
    ],
  },
] as const

export async function Footer() {
  const t = await getTranslations("footer")
  const tNav = await getTranslations("nav")
  const tCommon = await getTranslations("common")
  const tWhatsapp = await getTranslations("whatsapp")

  return (
    <footer className="bg-aurora relative overflow-hidden">
      <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-rose-300 to-transparent" />

      <div className="container-custom relative pt-16 pb-8 lg:pt-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Brand and contact */}
          <div className="space-y-6 lg:col-span-4">
            <Image src="/brand/logo-color.png" alt="Buildcaps" width={170} height={32} className="h-8 w-auto" />
            <p className="max-w-sm text-sm leading-relaxed text-neutral-600">{t("about")}</p>

            <address className="space-y-3 text-sm not-italic text-neutral-700">
              <p className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span>
                  {t("address")}
                  <span className="mt-1 block text-neutral-500">{t("hours")}</span>
                </span>
              </p>
              {site.phones.map((phone) => (
                <a key={phone.href} href={phone.href} className="flex items-center gap-3 hover:text-neutral-900">
                  <Phone className="h-4 w-4 shrink-0 text-rose-500" />
                  <bdi dir="ltr">{phone.display}</bdi>
                </a>
              ))}
              <a href={`mailto:${site.email}`} className="flex items-center gap-3 hover:text-neutral-900">
                <Mail className="h-4 w-4 shrink-0 text-rose-500" />
                <bdi dir="ltr">{site.email}</bdi>
              </a>
              <a
                href={whatsappUrl(tWhatsapp("prefill"))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 font-medium text-neutral-900"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-rose-500" />
                {tCommon("whatsapp")}
              </a>
            </address>

            <div>
              <p className="sr-only">{t("social")}</p>
              <ul className="flex gap-2">
                {site.social.map(({ name, href }) => {
                  const Icon = socialIcons[name]
                  return (
                    <li key={name}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={name}
                        className="border-gradient flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-neutral-700 transition-colors hover:text-rose-700"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label={t("explore")} className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-label mb-4 text-rose-700">
                  {column.title === "explore" ? t("explore") : column.title === "company" ? t("company") : tNav("services")}
                </p>
                <ul className="space-y-2.5 text-sm">
                  {column.links.map(({ href, key }) => (
                    <li key={href}>
                      <Link href={href} className="text-neutral-600 transition-colors hover:text-neutral-900">
                        {tNav(key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <p className="mb-2 text-lg font-semibold text-neutral-900">{t("newsletterTitle")}</p>
            <p className="mb-5 text-sm leading-relaxed text-neutral-600">{t("newsletterBody")}</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Oversized rose-gold wordmark */}
        <p
          aria-hidden
          dir="ltr"
          className="text-rose-metal pointer-events-none mt-16 select-none text-center text-[17vw] font-bold leading-[0.8] tracking-tighter opacity-25 lg:text-[13rem]"
        >
          BUILDCAPS
        </p>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 text-xs text-neutral-500 md:flex-row">
          <p className="text-center md:text-start">
            {t("copyright", { year: new Date().getFullYear() })}
            {site.orn && <span className="ms-3">{t("orn", { number: site.orn })}</span>}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <li>
              <Link href="/privacy" className="hover:text-neutral-800">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-neutral-800">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-neutral-800">
                {t("cookies")}
              </Link>
            </li>
            <li>
              <ConsentSettingsButton className="hover:text-neutral-800" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
