"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

type Wave = { id: number; x: number; y: number; size: number }

/**
 * Press ripple. Drop it inside any `relative overflow-hidden` button or link;
 * it listens to its parent's pointerdown, so the host needs no extra wiring.
 */
export function Ripple({ color = "rgb(255 255 255 / 0.35)" }: { color?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()
  const [waves, setWaves] = useState<Wave[]>([])

  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host || reduceMotion) return
    const handleDown = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const size = Math.hypot(rect.width, rect.height) * 2
      setWaves((current) => [...current, { id: event.timeStamp, x: event.clientX - rect.left, y: event.clientY - rect.top, size }])
    }
    host.addEventListener("pointerdown", handleDown)
    return () => host.removeEventListener("pointerdown", handleDown)
  }, [reduceMotion])

  return (
    <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {waves.map((wave) => (
        <motion.span
          key={wave.id}
          // Physical offsets: the pointer coordinates are physical too.
          className="absolute left-0 top-0 rounded-full"
          style={{ width: wave.size, height: wave.size, marginLeft: wave.x - wave.size / 2, marginTop: wave.y - wave.size / 2, background: color }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          onAnimationComplete={() => setWaves((current) => current.filter((w) => w.id !== wave.id))}
        />
      ))}
    </span>
  )
}
