"use client"

import { Children, useRef, type ReactNode } from "react"
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion"
import { useDirSign, useMediaQuery } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

function DeckCard({
  children,
  index,
  count,
  progress,
  spread,
}: {
  children: ReactNode
  index: number
  count: number
  progress: MotionValue<number>
  spread: number
}) {
  const sign = useDirSign()
  const offset = index - (count - 1) / 2
  const x = useTransform(progress, [0, 1], [0, offset * spread * sign])
  const y = useTransform(progress, [0, 1], [index * -6, Math.abs(offset) * 18])
  const rotate = useTransform(progress, [0, 1], [(index - count + 1) * 2.5, offset * 7 * sign])

  return (
    <motion.div className="absolute inset-0" style={{ x, y, rotate, zIndex: count - Math.abs(Math.round(offset)) }}>
      {children}
    </motion.div>
  )
}

/** Cards stacked like a deck that fan out as the section scrolls into the middle of the screen. */
export function StackedDeck({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const cards = Children.toArray(children)
  const wide = useMediaQuery("(min-width: 768px)")
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })

  return (
    <div ref={ref} className={cn("relative mx-auto aspect-[3/4] w-56 md:w-64", className)}>
      {cards.map((card, i) => (
        <DeckCard key={i} index={i} count={cards.length} progress={progress} spread={wide ? 230 : 70}>
          {card}
        </DeckCard>
      ))}
    </div>
  )
}
