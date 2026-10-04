"use client"

import { useState, type PointerEvent, type ReactNode } from "react"
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { useFinePointer } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

const spring = { stiffness: 350, damping: 30, mass: 0.5 }

/** A rose-gold "View" / "Drag" bubble that trails the cursor over media. Decorative only. */
export function MediaCursor({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const finePointer = useFinePointer()
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, spring)
  const sy = useSpring(y, spring)
  const active = finePointer && !reduceMotion

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set(event.clientX - rect.left)
    y.set(event.clientY - rect.top)
  }

  return (
    <div
      className={cn("relative", active && "cursor-none", className)}
      onPointerMove={active ? handleMove : undefined}
      onPointerEnter={active ? () => setVisible(true) : undefined}
      onPointerLeave={active ? () => setVisible(false) : undefined}
    >
      {children}
      <AnimatePresence>
        {active && visible && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -ml-10 -mt-10 left-0 top-0 z-20 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-300 via-rose-500 to-rose-700 text-xs font-semibold tracking-wide text-white shadow-[0_10px_40px_-10px_rgb(183_110_121/0.8)]"
            // Physical left/top/margins on purpose: the coordinates come from clientX, which is not
            // direction-aware. The negative margins centre the 80px bubble on the pointer.
            style={{ x: sx, y: sy }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
