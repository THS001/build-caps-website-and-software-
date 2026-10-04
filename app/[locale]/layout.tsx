import type React from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { isRtl, localeTags, type Locale } from "@/i18n/locales"
import { fontVariables, localeFontStack } from "@/lib/fonts"
import { site } from "@/lib/site"
import { Providers } from "@/components/providers"
import { IntroLoader, introScript } from "@/components/motion/intro-loader"
import "../globals.css"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "meta" })

  // Canonical and hreflang are set per page (see lib/seo.ts); a layout-level
  // canonical would be inherited by every page and point them all at the home page.
  return {
    metadataBase: new URL(site.url),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: t("siteName"),
    openGraph: {
      siteName: t("siteName"),
      title: t("defaultTitle"),
      description: t("defaultDescription"),
      type: "website",
      locale: localeTags[locale as Locale].replace("-", "_"),
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: t("siteName") }],
    },
    twitter: { card: "summary_large_image", title: t("defaultTitle"), description: t("defaultDescription"), images: ["/og-default.png"] },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const dir = isRtl(locale) ? "rtl" : "ltr"

  return (
    <html
      lang={locale}
      dir={dir}
      // The intro script below adds a class to <html> before React hydrates.
      suppressHydrationWarning
      className={`${fontVariables} antialiased`}
      style={{ "--font-locale": localeFontStack[locale] } as React.CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="font-sans bg-white text-neutral-900 overflow-x-hidden">
        <IntroLoader />
        <NextIntlClientProvider>
          <Providers dir={dir}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
