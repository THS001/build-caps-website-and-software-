"use client"

import { useRef, type PointerEvent, type ReactNode } from "react"
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { useFinePointer } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

const spring = { stiffness: 220, damping: 22, mass: 0.6 }

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** Maximum tilt in degrees. */
  max?: number
  /** Soft light that follows the cursor across the surface. */
  glare?: boolean
}

/** 3D tilt toward the cursor with a moving glare. Static on touch screens and for reduced motion. */
export function TiltCard({ children, className, max = 7, glare = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const finePointer = useFinePointer()
  const reduceMotion = useReducedMotion()
  const active = finePointer && !reduceMotion

  const rotateX = useSpring(0, spring)
  const rotateY = useSpring(0, spring)
  const glareX = useMotionValue(50)
  const glareY = useMotionValue(50)
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 })
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.38), transparent 55%)`

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    rotateY.set((px - 0.5) * max * 2)
    rotateX.set((0.5 - py) * max * 2)
    glareX.set(px * 100)
    glareY.set(py * 100)
    glareOpacity.set(1)
  }

  const handleLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    glareOpacity.set(0)
  }

  // Always the same element tree, so switching pointer type never remounts the children.
  return (
    <motion.div
      ref={ref}
      onPointerMove={active ? handleMove : undefined}
      onPointerLeave={active ? handleLeave : undefined}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
      {glare && active && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glareBackground, opacity: glareOpacity }}
        />
      )}
    </motion.div>
  )
}
