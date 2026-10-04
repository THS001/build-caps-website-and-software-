"use client"

import type { ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useDirSign } from "@/hooks/use-motion-env"

const ease = [0.21, 0.47, 0.32, 0.98] as const

const variants = {
  enter: (d: number) => ({ x: 48 * d, opacity: 0, filter: "blur(4px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (d: number) => ({ x: -48 * d, opacity: 0, filter: "blur(4px)" }),
}

type StepTransitionProps = {
  /** Changes whenever the visible step changes. */
  stepKey: string | number
  /** 1 when moving forward, -1 when going back. */
  direction: 1 | -1
  children: ReactNode
  className?: string
}

/** Wizard steps (booking flow, Match Me quiz) slide in from the reading direction. */
export function StepTransition({ stepKey, direction, children, className }: StepTransitionProps) {
  const custom = direction * useDirSign()

  return (
    <AnimatePresence mode="wait" initial={false} custom={custom}>
      <motion.div
        key={stepKey}
        custom={custom}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.35, ease }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
