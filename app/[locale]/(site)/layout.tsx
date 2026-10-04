import type React from "react"
import type { Locale } from "@/i18n/locales"
import { hasOwnMessage } from "@/i18n/messages"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/site/whatsapp-button"
import { Concierge } from "@/components/ai/concierge"
import { SearchPalette } from "@/components/search/search-palette"
import { ConsentBanner } from "@/components/site/consent-banner"
import { SiteAnalytics } from "@/components/site/analytics"

/** Public site chrome. The admin (app/[locale]/admin) has its own layout. */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  // The advisor's comments stay off in languages they aren't translated into yet.
  const talkative = locale === "en" || (await hasOwnMessage(locale as Locale, ["ai", "buddy", "lines", "hello"]))
  return (
    <>
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />
      <Concierge talkative={talkative} />
      <SearchPalette />
      <ConsentBanner />
      <SiteAnalytics />
    </>
  )
}
