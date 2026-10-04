"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { useDirSign } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

const ease = [0.77, 0, 0.18, 1] as const

type ClipRevealProps = {
  children: ReactNode
  className?: string
  /** Edge the reveal grows from. "start" follows reading direction (left in LTR, right in RTL). */
  from?: "start" | "bottom"
  delay?: number
}

/** Wipes media into view with a clip-path while the content settles from a slight zoom. */
export function ClipReveal({ children, className, from = "start", delay = 0 }: ClipRevealProps) {
  const ltr = useDirSign() === 1
  // inset(top right bottom left): fully clipped from the far edge, then opened.
  const hidden =
    from === "bottom" ? "inset(100% 0% 0% 0%)" : ltr ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)"

  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      initial={{ clipPath: hidden }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 1.1, delay, ease }}
    >
      <motion.div
        className="h-full w-full"
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 1.4, delay, ease }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
