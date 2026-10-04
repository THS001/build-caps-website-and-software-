"use client"

import { useEffect, useId, useRef, useState, type RefObject } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"

// "Ask Buildcaps" has a face: a property advisor whose eyes follow the pointer
// and who comments, a little drily, on what the visitor is doing (scrolling fast,
// going back and forth, lingering on a section, browsing late, about to leave).
// Every line is said at most once per visit, with a pause between lines, and a
// visitor can silence him for the session.

export type Mood = "neutral" | "smirk" | "happy" | "surprised" | "sleepy" | "wink"

export type LineKey =
  | "hello"
  | "night"
  | "fastScroll"
  | "scrollBack"
  | "idle"
  | "exit"
  | "featured"
  | "opportunities"
  | "communities"
  | "tools"
  | "insights"
  | "listing"
  | "listings"
  | "offPlan"
  | "offPlanFan"
  | "villaFan"
  | "tool"
  | "book"
  | "searchClosed"

const MOOD: Record<LineKey, Mood> = {
  hello: "happy",
  night: "wink",
  fastScroll: "surprised",
  scrollBack: "smirk",
  idle: "sleepy",
  exit: "surprised",
  featured: "smirk",
  opportunities: "wink",
  communities: "happy",
  tools: "smirk",
  insights: "happy",
  listing: "smirk",
  listings: "neutral",
  offPlan: "happy",
  offPlanFan: "wink",
  villaFan: "smirk",
  tool: "neutral",
  book: "happy",
  searchClosed: "smirk",
}

/** Lines that offer a ready-made question for the chat. */
export const ASKS: Partial<Record<LineKey, string>> = {
  listing: "listing",
  listings: "listings",
  communities: "communities",
  featured: "listing",
  offPlan: "offPlan",
  offPlanFan: "offPlan",
  tools: "tools",
  tool: "tools",
  searchClosed: "search",
}

/* ── The face ─────────────────────────────────────────────────────────── */

/** Pupils follow the pointer; on touch screens they glance the way the page scrolls. */
function useLook(target: RefObject<HTMLElement | null>, still: boolean) {
  const [look, setLook] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (still) return
    let raf = 0
    let px = 0
    let py = 0
    const apply = () => {
      raf = 0
      const el = target.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = px - (r.left + r.width / 2)
      const dy = py - (r.top + r.height * 0.47)
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, d / 200)
      setLook({ x: (dx / d) * k, y: (dy / d) * k })
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    }
    let lastY = window.scrollY
    let settle: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      setLook({ x: 0, y: Math.max(-1, Math.min(1, dy / 30)) })
      clearTimeout(settle)
      settle = setTimeout(() => setLook({ x: 0, y: 0 }), 500)
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches
    window.addEventListener("pointermove", onMove, { passive: true })
    if (coarse) window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [target, still])
  return look
}

function useBlink(still: boolean) {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (still) return
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        setClosed(true)
        setTimeout(() => setClosed(false), 130)
        next()
      }, 2400 + Math.random() * 3600)
    }
    next()
    return () => clearTimeout(timer)
  }, [still])
  return closed
}

const SKIN = "#e7b38d"
const HAIR = "#2b1f19"

/** The advisor: navy suit, tie in the brand's rose gold, a sparkle pin on the lapel. */
export function BuddyFace({ mood, target }: { mood: Mood; target: RefObject<HTMLElement | null> }) {
  const reduce = Boolean(useReducedMotion())
  const look = useLook(target, reduce)
  const blink = useBlink(reduce)
  const id = useId().replace(/:/g, "")
  const brow = {
    neutral: [0, 0],
    smirk: [0, -1.8],
    happy: [-0.6, -0.6],
    surprised: [-2, -2],
    sleepy: [0.8, 0.8],
    wink: [0, -1],
  }[mood]
  const lid = blink ? 0.08 : mood === "sleepy" ? 0.45 : mood === "surprised" ? 1.15 : 1
  const eye = (cx: number, side: 0 | 1) => {
    if (mood === "wink" && side === 1 && !blink) return <path d={`M${cx - 3} ${28.6} Q${cx} ${30.4} ${cx + 3} ${28.6}`} stroke={HAIR} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    const ix = cx + look.x * 1.3
    const iy = 28.4 + look.y * 0.9
    return (
      <g transform={`translate(${cx} 28.4) scale(1 ${lid}) translate(${-cx} -28.4)`} style={{ transition: "transform 90ms ease-out" }}>
        <ellipse cx={cx} cy="28.4" rx="3.2" ry="2.6" fill="#ffffff" />
        <circle cx={ix} cy={iy} r="1.65" fill="#4a3022" style={{ transition: "cx 80ms linear, cy 80ms linear" }} />
        <circle cx={ix} cy={iy} r="0.85" fill="#0d0d0d" style={{ transition: "cx 80ms linear, cy 80ms linear" }} />
        <circle cx={ix + 0.55} cy={iy - 0.55} r="0.42" fill="#ffffff" style={{ transition: "cx 80ms linear, cy 80ms linear" }} />
        <path d={`M${cx - 3.3} 27.6 Q${cx} 25.2 ${cx + 3.3} 27.6`} stroke="#b9805c" strokeWidth="0.6" fill="none" />
      </g>
    )
  }
  const mouth = {
    neutral: <path d="M28.4 37.3 Q32 38.7 35.6 37.3" stroke="#8a3f36" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    smirk: <path d="M28.6 37.8 Q32.4 38.8 36.2 36.1" stroke="#8a3f36" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    wink: <path d="M28.4 37.2 Q32.2 39.6 36 36.6" stroke="#8a3f36" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    happy: <path d="M27.8 36.5 Q32 41.4 36.2 36.5 Q32 38.3 27.8 36.5 Z" fill="#7d2f2a" stroke="#7d2f2a" strokeWidth="0.6" strokeLinejoin="round" />,
    surprised: <ellipse cx="32" cy="37.8" rx="1.6" ry="2" fill="#6e2a26" />,
    sleepy: <path d="M29.2 37.7 L34.8 37.7" stroke="#8a3f36" strokeWidth="1.1" strokeLinecap="round" />,
  }[mood]

  return (
    // Framed on the head and shoulders (52 of the 64 units) so the face reads at launcher size.
    <svg viewBox="6 4 52 52" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="32" cy="30" r="26" />
        </clipPath>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24467a" />
          <stop offset="1" stopColor="#0b1d3a" />
        </linearGradient>
        <radialGradient id={`${id}skin`} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#f7d6b8" />
          <stop offset="1" stopColor={SKIN} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="64" height="64" fill={`url(#${id}bg)`} />
        {/* Suit, shirt and tie */}
        <path d="M6 64 C8 50 19 45.5 32 45.5 C45 45.5 56 50 58 64 Z" fill="#102544" />
        <path d="M26.5 45.5 L32 54 L37.5 45.5 Z" fill="#ffffff" />
        <path d="M30.7 47.2 L32 49.2 L33.3 47.2 L32.8 56.5 L32 58.5 L31.2 56.5 Z" fill="#b76e79" />
        <path d="M26.5 45.5 L32 54 L27.6 64 L19 64 Z" fill="#183564" />
        <path d="M37.5 45.5 L32 54 L36.4 64 L45 64 Z" fill="#183564" />
        <path d="M41.6 49.6 l0.7 1.5 1.5 0.7 -1.5 0.7 -0.7 1.5 -0.7 -1.5 -1.5 -0.7 1.5 -0.7 z" fill="#e3cfae" />
        {/* Neck */}
        <rect x="28.4" y="38" width="7.2" height="9" rx="3" fill="#d39c74" />
        {/* Head turns a little toward the pointer */}
        <g transform={`rotate(${look.x * 4} 32 32)`} style={{ transition: "transform 120ms ease-out" }}>
          <ellipse cx="19.3" cy="29.2" rx="2" ry="3" fill={SKIN} />
          <ellipse cx="44.7" cy="29.2" rx="2" ry="3" fill={SKIN} />
          <ellipse cx="32" cy="28.2" rx="13" ry="14.6" fill={`url(#${id}skin)`} />
          {mood === "happy" && (
            <>
              <circle cx="24.8" cy="33" r="2.2" fill="#e88a7c" opacity="0.35" />
              <circle cx="39.2" cy="33" r="2.2" fill="#e88a7c" opacity="0.35" />
            </>
          )}
          {/* Hair, side-parted */}
          <path d="M18.8 27 C17.6 15.6 24.6 10.6 32.4 10.6 C41 10.6 46.8 15.6 45.2 27 C44.3 21.4 41.2 18.6 35.8 18 C30.8 17.6 25 19.6 21.4 22.4 C20.2 23.6 19.4 25.1 18.8 27 Z" fill={HAIR} />
          <path d="M26 13.6 C29.6 12.2 34.2 12.2 37.8 13.8" stroke="#4a3a30" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* Brows */}
          <path d="M23.6 23.4 Q27 21.6 30.2 23" stroke={HAIR} strokeWidth="1.5" fill="none" strokeLinecap="round" transform={`translate(0 ${brow[0]})`} style={{ transition: "transform 200ms ease-out" }} />
          <path d="M33.8 23 Q37 21.6 40.4 23.4" stroke={HAIR} strokeWidth="1.5" fill="none" strokeLinecap="round" transform={`translate(0 ${brow[1]}) rotate(${mood === "smirk" ? -7 : 0} 37 22.5)`} style={{ transition: "transform 200ms ease-out" }} />
          {eye(27.2, 0)}
          {eye(36.8, 1)}
          <path d="M32 29.6 Q30.9 33.6 32.6 34.1" stroke="#c08560" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          {mouth}
        </g>
      </g>
      <circle cx="32" cy="30" r="25.35" fill="none" stroke="#ffffff" strokeWidth="1.3" />
    </svg>
  )
}

/* ── What he notices ──────────────────────────────────────────────────── */

type Memory = { said: LineKey[]; count: number; muted: boolean; dismissed: number; offPlan: string[]; villas: string[] }
const STORE = "bc-buddy"
const GAP_MS = 18_000
const MAX_LINES = 7

function readMemory(): Memory {
  try {
    const raw = sessionStorage.getItem(STORE)
    if (raw) return JSON.parse(raw) as Memory
  } catch {}
  return { said: [], count: 0, muted: false, dismissed: 0, offPlan: [], villas: [] }
}
function writeMemory(m: Memory) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(m))
  } catch {}
}

function routeLine(path: string): LineKey | null {
  if (/^\/properties\/[^/]+/.test(path)) return "listing"
  if (path === "/properties") return "listings"
  if (/^\/off-plan(\/|$)/.test(path)) return "offPlan"
  if (/^\/communities(\/|$)/.test(path)) return "communities"
  if (/^\/tools\/[^/]+/.test(path)) return "tool"
  if (path === "/tools") return "tools"
  if (/^\/insights\/[^/]+/.test(path)) return "insights"
  return null
}

/**
 * Watches scrolling, pauses, sections in view, page visits and a few gestures,
 * and picks the line that fits. Quiet while hidden, while the chat or search is
 * open, and once silenced.
 */
export function useBuddyTalk({ active }: { active: boolean }) {
  const pathname = usePathname()
  const [line, setLine] = useState<LineKey | null>(null)
  const [mood, setMood] = useState<Mood>("neutral")
  const lastAt = useRef(0)
  const activeRef = useRef(active)
  activeRef.current = active
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flash = (m: Mood, ms = 1600) => {
    setMood(m)
    clearTimeout(moodTimer.current)
    moodTimer.current = setTimeout(() => setMood("neutral"), ms)
  }

  /** `dialogClosing`: the caller knows the open dialog is on its way out (it may still be animating). */
  const say = (key: LineKey, dialogClosing = false) => {
    if (!activeRef.current || (!dialogClosing && document.querySelector('[role="dialog"][aria-modal="true"]'))) return false
    const mem = readMemory()
    if (mem.muted || mem.count >= MAX_LINES || mem.said.includes(key) || Date.now() - lastAt.current < GAP_MS) return false
    mem.said.push(key)
    mem.count++
    writeMemory(mem)
    lastAt.current = Date.now()
    setLine(key)
    flash(MOOD[key], 9000)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setLine(null), 9000)
    return true
  }
  const sayRef = useRef(say)
  sayRef.current = say

  // A greeting the first time he appears (or a wink after midnight).
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => sayRef.current(new Date().getHours() < 5 ? "night" : "hello"), 2500)
    return () => clearTimeout(id)
  }, [active])

  // Scrolling: very fast, or back and forth.
  useEffect(() => {
    let lastY = window.scrollY
    let lastT = performance.now()
    let fastSince = 0
    let dir = 0
    const flips: number[] = []
    const onScroll = () => {
      const now = performance.now()
      const dy = window.scrollY - lastY
      const speed = Math.abs(dy) / Math.max(1, now - lastT)
      lastY = window.scrollY
      lastT = now
      if (speed > 2.6) {
        fastSince ||= now
        if (now - fastSince > 260) {
          if (!sayRef.current("fastScroll")) flash("surprised")
          fastSince = 0
        }
      } else fastSince = 0
      const d = Math.sign(dy)
      if (d && Math.abs(dy) > 30 && d !== dir) {
        dir = d
        flips.push(now)
        while (flips.length && now - flips[0] > 9000) flips.shift()
        if (flips.length >= 5) {
          sayRef.current("scrollBack")
          flips.length = 0
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Doing nothing for a while, or heading for the tab bar.
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout>
    const wake = () => {
      clearTimeout(idle)
      idle = setTimeout(() => {
        if (!sayRef.current("idle")) flash("sleepy", 4000)
      }, 40_000)
    }
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) sayRef.current("exit")
    }
    const events = ["pointermove", "scroll", "keydown", "touchstart"] as const
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }))
    document.documentElement.addEventListener("mouseleave", onLeave)
    wake()
    return () => {
      clearTimeout(idle)
      events.forEach((ev) => window.removeEventListener(ev, wake))
      document.documentElement.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  // Lingering on a home-page section for five seconds.
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-buddy]")]
    if (!els.length) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: string | null = null
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries.filter((e) => e.isIntersecting && e.intersectionRatio >= 0.5).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const key = best ? (best.target as HTMLElement).dataset.buddy ?? null : null
        if (key === current) return
        current = key
        clearTimeout(timer)
        if (key) timer = setTimeout(() => sayRef.current(key as LineKey), 5000)
      },
      { threshold: [0.5, 0.75] },
    )
    els.forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [pathname])

  // Pages: what they are looking at, and patterns across the visit.
  useEffect(() => {
    const mem = readMemory()
    const project = pathname.match(/^\/off-plan\/([^/]+)/)?.[1]
    if (project && !mem.offPlan.includes(project)) mem.offPlan.push(project)
    const listing = pathname.match(/^\/properties\/([^/]+)/)?.[1]
    if (listing && /villa|townhouse/.test(listing) && !mem.villas.includes(listing)) mem.villas.push(listing)
    writeMemory(mem)
    const key: LineKey | null = mem.offPlan.length >= 3 && !mem.said.includes("offPlanFan") ? "offPlanFan" : mem.villas.length >= 2 && !mem.said.includes("villaFan") ? "villaFan" : routeLine(pathname)
    if (!key) return
    const id = setTimeout(() => sayRef.current(key), 7000)
    return () => clearTimeout(id)
  }, [pathname])

  // Hovering "Book a call", and closing the search without opening anything.
  useEffect(() => {
    const onOver = (e: PointerEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (a && /\/book(\?|$)/.test(a.getAttribute("href") ?? "")) sayRef.current("book")
    }
    // The event means the search window is closed, even if its exit animation is still running.
    let later: ReturnType<typeof setTimeout> | undefined
    const onSearchClosed = (e: Event) => {
      if (!(e as CustomEvent<{ hadQuery?: boolean }>).detail?.hadQuery) return
      clearTimeout(later)
      later = setTimeout(() => sayRef.current("searchClosed", true), 600)
    }
    window.addEventListener("pointerover", onOver, { passive: true })
    window.addEventListener("buildcaps:search-closed", onSearchClosed)
    return () => {
      clearTimeout(later)
      window.removeEventListener("pointerover", onOver)
      window.removeEventListener("buildcaps:search-closed", onSearchClosed)
    }
  }, [])

  useEffect(() => {
    if (!active) setLine(null)
  }, [active])

  const dismiss = () => {
    setLine(null)
    const mem = readMemory()
    mem.dismissed++
    // Waved away twice: quiet for the rest of the visit.
    if (mem.dismissed >= 2) mem.muted = true
    writeMemory(mem)
  }

  return { line, mood, setMood: flash, dismiss, clear: () => setLine(null) }
}

/* ── The speech bubble ────────────────────────────────────────────────── */

export function BuddyBubble({ line, onAsk, onDismiss }: { line: LineKey | null; onAsk: (key: LineKey) => void; onDismiss: () => void }) {
  const t = useTranslations("ai.buddy")
  return (
    <AnimatePresence>
      {line && (
        <motion.div
          key={line}
          role="status"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="fixed end-[92px] bottom-[100px] z-40 w-[min(270px,calc(100vw-120px))] origin-bottom-right rounded-2xl rounded-ee-md bg-white p-3.5 text-sm text-neutral-800 shadow-[0_20px_50px_-15px_rgb(0_23_63/0.45)] ring-1 ring-neutral-200 rtl:origin-bottom-left md:end-[116px] md:bottom-[116px]"
        >
          <button type="button" onClick={onDismiss} aria-label={t("dismiss")} className="absolute end-1.5 top-1.5 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pe-5 leading-snug">{t(`lines.${line}`)}</p>
          <button type="button" onClick={() => onAsk(line)} className="mt-2.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
            {ASKS[line] ? t(`asks.${ASKS[line]}`) : t("chat")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
