"use client"

import { motion, useScroll, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

/** Thin rose-gold reading-progress line; grows from the reading-start edge. */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className={cn(
        "h-0.5 origin-left bg-gradient-to-r from-rose-700 via-rose-300 to-rose-500 rtl:origin-right",
        className,
      )}
    />
  )
}
