"use client"

import { useEffect, useRef } from "react"
import { animate, useInView, useReducedMotion } from "framer-motion"
import { useLocale } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { intlLocale } from "@/lib/format"

type CountUpProps = {
  value: number
  /** Intl options, e.g. { style: "currency", currency: "AED", notation: "compact" }. */
  format?: Intl.NumberFormatOptions
  duration?: number
  className?: string
}

/**
 * Counts from zero when it scrolls into view. The server renders the final
 * number, so crawlers, no-JS visitors and reduced-motion visitors see the real value.
 */
export function CountUp({ value, format, duration = 1.8, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const locale = useLocale() as Locale
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" })
  const reduceMotion = useReducedMotion()
  const formatter = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0, ...format })

  useEffect(() => {
    if (!inView || reduceMotion || !ref.current) return
    const node = ref.current
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      // Written straight to the DOM: no React render per frame.
      onUpdate: (latest) => (node.textContent = formatter.format(latest)),
    })
    return () => controls.stop()
    // formatter is derived from locale and format, which are stable for a mounted counter.
  }, [inView, reduceMotion, value, duration])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatter.format(value)}
    </span>
  )
}
