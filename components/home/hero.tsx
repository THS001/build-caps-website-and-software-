"use client"

// Home hero, on one centre axis: live chip → headline → AI search → quick asks.
// A real Dubai video plays in a frame that shrinks and rounds as you scroll
// (scroll 0→400px: scale 1→0.85, radius 0→48px, height 100→62.5svh), with a giant
// wordmark at the foot of the first screen. The search bar rises in once the
// headline has landed and tilts gently toward the pointer.

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { AnimatedText } from "@/components/animated-text"
import { Photo } from "@/components/media/photo"
import { openSearch } from "@/components/search/search-palette"
import { heroVideo } from "@/lib/media"

const EASE = [0.25, 0.46, 0.45, 0.94] as const
const easeOutQuad = (t: number) => t * (2 - t)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
// Serif display face only where it has the glyphs; other scripts keep their own fonts.
const DISPLAY_LOCALES = ["en", "ru", "fr", "de", "it"]

/** Types each example out, holds it, deletes it, then moves to the next. */
function useTypewriter(lines: string[], enabled: boolean) {
  const [text, setText] = useState("")
  useEffect(() => {
    if (!enabled || !lines.length) return
    let line = 0
    let pos = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const full = lines[line]
      if (!deleting) {
        pos++
        setText(full.slice(0, pos))
        if (pos >= full.length) {
          deleting = true
          timer = setTimeout(tick, 1900)
          return
        }
        timer = setTimeout(tick, 38)
      } else {
        pos--
        setText(full.slice(0, pos))
        if (pos <= 0) {
          deleting = false
          line = (line + 1) % lines.length
          timer = setTimeout(tick, 350)
          return
        }
        timer = setTimeout(tick, 18)
      }
    }
    timer = setTimeout(tick, 600)
    return () => clearTimeout(timer)
  }, [lines, enabled])
  return text
}

export function Hero() {
  const t = useTranslations("home.hero")
  const ts = useTranslations("home.search")
  const locale = useLocale()
  const reduce = useReducedMotion()
  const [p, setP] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const [searchIn, setSearchIn] = useState(false)
  const [examples] = useState(() => ts.raw("examples") as string[])
  const typed = useTypewriter(examples, searchIn && !reduce)
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const display = DISPLAY_LOCALES.includes(locale)
  const [mac, setMac] = useState(true)
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), [])

  // Gentle 3D tilt of the search card toward the pointer; flat while the pointer is on it.
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 })
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 })

  // The video loads after hydration (fast first paint), never on Data Saver or for
  // reduced motion. Phones get a ~0.7 MB clip, larger screens the 1080p one.
  useEffect(() => {
    const v = video.current
    if (!v || reduce) return
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData) return
    v.muted = true
    v.src = window.matchMedia("(min-width: 768px)").matches ? heroVideo.desktop : heroVideo.mobile
    const start = () => {
      setVideoReady(true)
      v.play().catch(() => {})
    }
    v.addEventListener("canplay", start, { once: true })
    // preload="none" keeps the first paint light; once a source is set, fetch and play it.
    v.preload = "auto"
    v.load()
    v.play().catch(() => {})
    return () => v.removeEventListener("canplay", start)
  }, [reduce])

  useEffect(() => {
    const id = setTimeout(() => setSearchIn(true), reduce ? 0 : 1500)
    return () => clearTimeout(id)
  }, [reduce])

  // Smoothed scroll progress over the first 400px (lerp 0.1 per frame).
  useEffect(() => {
    let raf = 0
    let current = 0
    const tick = () => {
      const target = Math.min(window.scrollY / 400, 1)
      current += (target - current) * 0.1
      setP(current)
      if (Math.abs(target - current) > 0.001) raf = requestAnimationFrame(tick)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !section.current) return
    if ((e.target as HTMLElement).closest("[data-hero-search]")) {
      rx.set(0)
      ry.set(0)
      return
    }
    const r = section.current.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6)
  }

  const frame = reduce ? 0 : p

  return (
    <section
      ref={section}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        rx.set(0)
        ry.set(0)
      }}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-white"
    >
      {/* The shrinking video frame */}
      <div className="absolute inset-0">
        <div
          className="relative w-full overflow-hidden bg-navy-900 will-change-transform"
          style={{ transform: `scale(${1 - easeOutQuad(frame) * 0.15})`, borderRadius: `${easeOutCubic(frame) * 48}px`, height: `${100 - easeOutQuad(frame) * 37.5}%`, transformOrigin: "top center" }}
        >
          <div className="absolute inset-0 motion-safe:animate-[kenburns_16s_ease-out_forwards]">
            <Photo photo={heroVideo.poster} priority sizes="100vw" quality={70} />
          </div>
          <video
            ref={video}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"}`}
          />
          {/* Legibility: darker at the top (header) and bottom (wordmark), clear in the middle */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/70 via-navy-900/40 to-navy-900/75" />
          <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_40%,rgb(0_23_63/0.35)_100%)]" />
        </div>
      </div>

      {/* One line, the search, and room to breathe. Top padding = header height + 24px and the
          wordmark keeps 40px above itself, so the pair sits centred between them, lifted 16px. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pt-[88px] text-center sm:px-8 lg:pt-[104px]" style={{ opacity: 1 - frame * 0.7 }}>
        <h1
          className="text-balance text-[clamp(2.75rem,7.5vw,8rem)] font-normal leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_30px_rgb(0_23_63/0.45)]"
          style={display ? { fontFamily: "var(--font-display), Georgia, serif" } : { fontWeight: 600 }}
        >
          <AnimatedText text={t("eyebrow")} delay={0.3} variant="blur" />
        </h1>

        {/* AI search: rises in once the line has landed; solid white, so nothing shows through */}
        <motion.div
          initial={false}
          animate={searchIn ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 24, filter: "blur(8px)" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-10 w-full max-w-3xl sm:mt-14"
          style={{ perspective: 1200, pointerEvents: searchIn ? "auto" : "none" }}
        >
          <motion.div data-hero-search style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative overflow-hidden rounded-full p-[2px] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]">
            <div
              aria-hidden
              className="absolute -inset-[200%] motion-safe:animate-[spin_6s_linear_infinite]"
              style={{ background: "conic-gradient(from 0deg, #0b1d3a 0deg, #d8c3a5 90deg, #9ab5d6 180deg, #d8c3a5 270deg, #0b1d3a 360deg)" }}
            />
            <button
              type="button"
              onClick={() => openSearch()}
              aria-label={t("searchLabel")}
              className="relative flex h-[68px] w-full items-center gap-3 rounded-full bg-white ps-2.5 pe-2.5 text-start"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-base text-neutral-500 sm:text-lg">
                {reduce || !typed ? t("searchLabel") : typed}
                {!reduce && <span className="ms-0.5 inline-block h-5 w-[2px] translate-y-1 animate-pulse bg-neutral-400" />}
              </span>
              <kbd className="hidden shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-sans text-xs text-neutral-500 md:block">{mac ? "⌘K" : "Ctrl K"}</kbd>
              <span className="flex h-12 shrink-0 items-center rounded-full bg-neutral-900 px-6 text-sm font-semibold text-white">{t("searchCta")}</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
      {/* Giant wordmark at the foot of the section, below the content so they never overlap */}
      <div className="pointer-events-none relative mt-auto flex justify-center overflow-hidden pt-10" style={{ transform: `translateY(${frame * 150}px)`, opacity: 1 - frame * 0.9 }} aria-hidden>
        <span className="block select-none text-[18vw] font-bold leading-[0.78] tracking-tighter text-white lg:text-[16.5vw]">BUILDCAPS</span>
      </div>
    </section>
  )
}
