"use client"

import { useRef, type PointerEvent, type ReactNode } from "react"
import { motion, useReducedMotion, useSpring } from "framer-motion"
import { useFinePointer } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

const spring = { stiffness: 180, damping: 15, mass: 0.4 }

/** Pulls its child (usually a CTA) toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const finePointer = useFinePointer()
  const reduceMotion = useReducedMotion()
  const active = finePointer && !reduceMotion
  const x = useSpring(0, spring)
  const y = useSpring(0, spring)

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={active ? handleMove : undefined}
      onPointerLeave={active ? reset : undefined}
      style={{ x, y }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  )
}
