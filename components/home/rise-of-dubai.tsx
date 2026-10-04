"use client"

import { AnimatePresence, motion, useTransform, type MotionValue } from "framer-motion"
import { PinnedStory, useStep } from "@/components/motion/pinned-story"

export type RiseMilestone = { year: number; title: string; body: string }

// Deterministic skyline: [x, width, floors]. The spike in the middle stands in for Burj Khalifa.
const TOWERS: [number, number, number][] = [
  [20, 46, 14], [70, 34, 22], [108, 52, 11], [164, 38, 30], [206, 44, 18], [254, 30, 36],
  [288, 56, 24], [348, 36, 42], [388, 48, 28], [436, 38, 52], [524, 40, 34],
  [562, 54, 26], [620, 34, 46], [658, 50, 20], [712, 40, 38], [756, 58, 16], [818, 36, 32],
  [858, 48, 24], [910, 42, 40], [956, 54, 12],
]
const FLOOR = 7 // px per floor
const GROUND = 470

function Tower({ x, width, floors, index, progress }: { x: number; width: number; floors: number; index: number; progress: MotionValue<number> }) {
  // Towers start one after another; each rises in whole floors, not a smooth stretch.
  const start = (index / TOWERS.length) * 0.55
  const built = useTransform(progress, (p) => {
    const t = Math.min(1, Math.max(0, (p - start) / 0.35))
    return Math.floor(t * floors) * FLOOR
  })
  const y = useTransform(built, (h) => GROUND - h)

  return (
    <motion.rect x={x} width={width} y={y} height={built} rx={1.5} fill="url(#tower)" stroke="rgb(255 255 255 / 0.08)" />
  )
}

function Spire({ progress }: { progress: MotionValue<number> }) {
  // Burj Khalifa silhouette: three set-back tiers and a needle, finishing last.
  const height = useTransform(progress, [0.35, 0.8], [0, 430], { clamp: true })
  const needleY = useTransform(height, (h) => GROUND - h)
  const midHeight = useTransform(height, (h) => Math.max(0, h - 120))
  const midY = useTransform(midHeight, (h) => GROUND - h)
  const baseHeight = useTransform(height, (h) => Math.max(0, h - 230))
  const baseY = useTransform(baseHeight, (h) => GROUND - h)

  return (
    <g>
      <motion.rect x={489} width={16} y={needleY} height={height} fill="url(#spire)" />
      <motion.rect x={484} width={26} y={midY} height={midHeight} fill="url(#spire)" />
      <motion.rect x={478} width={38} y={baseY} height={baseHeight} fill="url(#spire)" />
    </g>
  )
}

/**
 * "Rise of Dubai": the section pins while a skyline builds floor by floor and
 * the year rolls from milestone to milestone, one story card at a time.
 */
export function RiseOfDubai({ eyebrow, title, milestones }: { eyebrow: string; title: string; milestones: RiseMilestone[] }) {
  return (
    <PinnedStory length={4} className="bg-aurora">
      {(progress) => <Stage progress={progress} eyebrow={eyebrow} title={title} milestones={milestones} />}
    </PinnedStory>
  )
}

function Stage({
  progress,
  eyebrow,
  title,
  milestones,
}: {
  progress: MotionValue<number>
  eyebrow: string
  title: string
  milestones: RiseMilestone[]
}) {
  const count = milestones.length
  const step = useStep(progress, count)
  // The year holds on each milestone for most of its step and rolls to the next near the boundary.
  const year = useTransform(
    progress,
    milestones.flatMap((_, i) => [(i + 0.2) / count, (i + 0.8) / count]),
    milestones.flatMap((m) => [m.year, m.year]),
  )
  const yearText = useTransform(year, (y) => String(Math.round(y)))
  const sunY = useTransform(progress, [0, 1], [140, 40])
  const milestone = milestones[step]

  return (
    <div className="container-custom flex h-full flex-col gap-6 pt-24 pb-6 lg:flex-row lg:items-center lg:gap-16 lg:py-0">
      <div className="shrink-0 lg:w-5/12">
        <p className="text-label mb-4 text-rose-700">{eyebrow}</p>
        <h2 className="mb-4 text-2xl font-semibold leading-tight text-neutral-900 md:text-4xl lg:mb-6 lg:text-5xl">{title}</h2>
        <motion.p dir="ltr" className="text-rose-metal mb-3 text-5xl font-bold tabular-nums md:text-7xl lg:mb-6 lg:text-8xl" aria-hidden>
          {yearText}
        </motion.p>
        <div className="relative min-h-28 lg:min-h-36" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <p className="mb-2 text-sm font-semibold text-rose-700">{milestone.year}</p>
              <p className="mb-1 text-lg font-semibold text-neutral-900 lg:mb-2 lg:text-xl">{milestone.title}</p>
              <p className="max-w-md text-neutral-600">{milestone.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex gap-2 lg:mt-6" aria-hidden>
          {milestones.map((m, i) => (
            <span key={m.year} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-rose-500" : "bg-neutral-200"}`} />
          ))}
        </div>
      </div>

      {/* The skyline reads left to right in every language: it is a picture, not text. */}
      <div className="relative min-h-0 flex-1 lg:w-7/12 lg:flex-none" dir="ltr">
        <svg
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMax meet"
          className="absolute inset-0 h-full w-full lg:static lg:h-auto"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="tower" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#004274" />
              <stop offset="1" stopColor="#00173f" />
            </linearGradient>
            <linearGradient id="spire" x1="0" x2="1">
              <stop offset="0" stopColor="#8f4f5a" />
              <stop offset="0.5" stopColor="#d4a1a8" />
              <stop offset="1" stopColor="#b76e79" />
            </linearGradient>
            <radialGradient id="sun">
              <stop offset="0" stopColor="#f6e9eb" />
              <stop offset="1" stopColor="#d4a1a8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <motion.circle cx={780} cy={sunY} r={90} fill="url(#sun)" />
          {TOWERS.map(([x, width, floors], i) => (
            <Tower key={x} x={x} width={width} floors={floors} index={i} progress={progress} />
          ))}
          <Spire progress={progress} />
          <line x1={0} x2={1000} y1={GROUND} y2={GROUND} stroke="#b76e79" strokeOpacity={0.5} />
          <rect x={0} y={GROUND} width={1000} height={30} fill="#f0ede7" />
        </svg>
      </div>
    </div>
  )
}
