"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { usePathname } from "next/navigation"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import { CONSENT_CHANGED, readConsent, type Consent } from "@/lib/consent"
import { track } from "@/lib/track"

// Analytics and ad pixels, loaded only after consent and only when their IDs are
// set: GA4 and Microsoft Clarity need "analytics", Meta and TikTok "marketing".

const GA = process.env.NEXT_PUBLIC_GA_ID
const CLARITY = process.env.NEXT_PUBLIC_CLARITY_ID
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

export function SiteAnalytics() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    setConsent(readConsent())
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail)
    window.addEventListener(CONSENT_CHANGED, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED, onChange)
  }, [])

  // Google Consent Mode v2 mirrors the visitor's choice.
  useEffect(() => {
    if (!consent || !window.gtag) return
    window.gtag("consent", "update", {
      analytics_storage: consent.analytics ? "granted" : "denied",
      ad_storage: consent.marketing ? "granted" : "denied",
      ad_user_data: consent.marketing ? "granted" : "denied",
      ad_personalization: consent.marketing ? "granted" : "denied",
    })
  }, [consent])

  // Page views on client-side navigation (the first one is sent on load).
  useEffect(() => {
    window.fbq?.("track", "PageView")
    window.ttq?.page()
  }, [pathname])

  // Contact clicks anywhere on the site.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a")
      const href = a?.getAttribute("href") ?? ""
      if (href.includes("wa.me/")) track("whatsapp", { page: location.pathname })
      else if (href.startsWith("tel:")) track("call", { page: location.pathname })
      else if (href.includes("/go/")) track("funnel_click", { slug: href.split("/go/")[1]?.split(/[?#]/)[0] })
    }
    document.addEventListener("click", onClick, { capture: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [])

  const analytics = Boolean(consent?.analytics)
  const marketing = Boolean(consent?.marketing)

  return (
    <>
      {analytics && <VercelAnalytics />}
      {analytics && GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{analytics_storage:'granted',ad_storage:'${marketing ? "granted" : "denied"}',ad_user_data:'${marketing ? "granted" : "denied"}',ad_personalization:'${marketing ? "granted" : "denied"}'});gtag('js',new Date());gtag('config','${GA}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {analytics && CLARITY && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY}");`}
        </Script>
      )}
      {marketing && META && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META}');fbq('track','PageView');`}
        </Script>
      )}
      {marketing && TIKTOK && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${TIKTOK}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
    </>
  )
}
