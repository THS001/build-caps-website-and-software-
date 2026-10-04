"use client"

import { useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import { RotateCw } from "lucide-react"
import { useFinePointer } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

type FlipCardProps = {
  front: ReactNode
  back: ReactNode
  /** Accessible name for the flip button, e.g. "Show key numbers". */
  label: string
  className?: string
}

/**
 * Opportunity card that turns over to show the offer's key numbers. Flips on
 * hover with a mouse; on touch and keyboard via the corner button. The hidden
 * face is inert, so links on either face only work while that face is showing.
 */
export function FlipCard({ front, back, label, className }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)
  const finePointer = useFinePointer()

  return (
    <div
      className={cn("relative [perspective:1400px]", className)}
      onPointerEnter={finePointer ? () => setFlipped(true) : undefined}
      onPointerLeave={finePointer ? () => setFlipped(false) : undefined}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]" inert={flipped}>
          {front}
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]" inert={!flipped}>
          {back}
        </div>
      </motion.div>
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={label}
        onClick={() => setFlipped((f) => !f)}
        className="absolute end-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-sm backdrop-blur transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
      >
        <RotateCw className={cn("h-4 w-4 transition-transform duration-500", flipped && "-rotate-180")} />
      </button>
    </div>
  )
}
