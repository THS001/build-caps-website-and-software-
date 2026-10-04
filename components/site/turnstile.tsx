"use client"

import { useEffect, useRef } from "react"
import Script from "next/script"
import { useLocale } from "next-intl"

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

/**
 * Cloudflare Turnstile (free, privacy-friendly CAPTCHA alternative). Inside a
 * <form> it adds a hidden "cf-turnstile-response" field automatically; outside
 * one, use onToken. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */
export function Turnstile({ onToken, className }: { onToken?: (token: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const locale = useLocale()
  const callback = useRef(onToken)
  callback.current = onToken

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile || widget.current) return
      widget.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        language: locale,
        appearance: "interaction-only",
        callback: (token: string) => callback.current?.(token),
      })
    }
    const timer = setInterval(() => {
      if (window.turnstile) {
        clearInterval(timer)
        mount()
      }
    }, 200)
    return () => {
      cancelled = true
      clearInterval(timer)
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [locale])

  if (!siteKey) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" />
      <div ref={ref} className={className} />
    </>
  )
}
