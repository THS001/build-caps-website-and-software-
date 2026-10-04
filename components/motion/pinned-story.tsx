"use client"

import { useRef, useState, type ReactNode } from "react"
import { useMotionValueEvent, useScroll, type MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

type PinnedStoryProps = {
  /** How long the story stays pinned, in viewport heights of scrolling. */
  length?: number
  className?: string
  /** Receives scroll progress through the pinned stretch, 0 → 1. */
  children: (progress: MotionValue<number>) => ReactNode
}

/**
 * Pins a full-screen stage while the page scrolls past it and hands the
 * scroll progress to its children (the "Rise of Dubai" skyline, step stories).
 */
export function PinnedStory({ length = 3, className, children }: PinnedStoryProps) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  return (
    <section ref={ref} className={cn("relative", className)} style={{ height: `${length * 100}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">{children(scrollYProgress)}</div>
    </section>
  )
}

/** Which of `count` equal steps the progress is in; re-renders only when the step changes. */
export function useStep(progress: MotionValue<number>, count: number) {
  const [step, setStep] = useState(0)
  useMotionValueEvent(progress, "change", (p) => {
    const next = Math.min(count - 1, Math.floor(p * count))
    setStep((current) => (current === next ? current : next))
  })
  return step
}
