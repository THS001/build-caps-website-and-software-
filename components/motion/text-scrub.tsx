"use client"

import { useMemo, useRef } from "react"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { useLocale } from "next-intl"

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1])
  return <motion.span style={{ opacity }}>{children}</motion.span>
}

/** A paragraph whose words light up one by one as it scrolls through the viewport. */
export function TextScrub({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const locale = useLocale()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] })

  // Intl.Segmenter splits Chinese (no spaces) into real words; whitespace segments are kept as-is.
  const segments = useMemo(() => {
    if (typeof Intl.Segmenter === "function") {
      return Array.from(new Intl.Segmenter(locale, { granularity: "word" }).segment(text), (s) => s.segment)
    }
    return text.split(/(\s+)/)
  }, [text, locale])

  const total = segments.length

  return (
    <p ref={ref} className={className}>
      {segments.map((segment, i) =>
        /^\s+$/.test(segment) ? (
          segment
        ) : (
          <Word key={i} progress={scrollYProgress} range={[i / total, Math.min(1, (i + 2) / total)]}>
            {segment}
          </Word>
        ),
      )}
    </p>
  )
}
