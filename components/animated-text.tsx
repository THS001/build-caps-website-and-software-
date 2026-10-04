"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useLocale } from "next-intl"
import { wordAnimatedLocales, type Locale } from "@/i18n/locales"

interface AnimatedTextProps {
  text: string
  delay?: number
  /** "rise" (default) slides up; "blur" comes into focus with a slight 3D tilt (home hero). */
  variant?: "rise" | "blur"
}

const ease = [0.21, 0.47, 0.32, 0.98] as const

// Latin and Cyrillic animate per character, but each word stays in one unbreakable
// box so lines only wrap between words. Chinese has no spaces and may wrap between
// any two characters, so it keeps per-character boxes. Arabic-script and Devanagari
// animate per word, because splitting them breaks letter joining and conjuncts.
export function AnimatedText({ text, delay = 0, variant = "rise" }: AnimatedTextProps) {
  const locale = useLocale() as Locale
  const reduce = useReducedMotion()
  const blur = variant === "blur" && !reduce
  const from = blur ? { opacity: 0, y: 30, filter: "blur(12px)", rotateX: -45 } : { opacity: 0, y: 20 }
  const to = blur ? { opacity: 1, y: 0, filter: "blur(0px)", rotateX: 0 } : { opacity: 1, y: 0 }
  const duration = blur ? 0.6 : 0.5
  const box = { display: "inline-block", transformOrigin: "center bottom", ...(blur ? { transformStyle: "preserve-3d" as const } : {}) }
  const byWord = wordAnimatedLocales.includes(locale)
  const words = text.split(/(\s+)/)
  let index = 0

  return (
    <span style={blur ? { perspective: 400 } : undefined}>
      {words.map((word, w) => {
        if (/^\s+$/.test(word)) return <span key={w}>{word}</span>
        if (byWord) {
          const i = index++
          return (
            <motion.span
              key={w}
              initial={from}
              animate={to}
              transition={{ duration, delay: delay + i * 0.09, ease }}
              style={box}
            >
              {word}
            </motion.span>
          )
        }
        return (
          <span key={w} style={locale === "zh" ? undefined : { display: "inline-block", whiteSpace: "nowrap" }}>
            {Array.from(word).map((char, c) => {
              const i = index++
              return (
                <motion.span
                  key={c}
                  initial={from}
                  animate={to}
                  transition={{ duration, delay: delay + i * (blur ? 0.035 : 0.03), ease }}
                  style={box}
                >
                  {char}
                </motion.span>
              )
            })}
          </span>
        )
      })}
    </span>
  )
}
