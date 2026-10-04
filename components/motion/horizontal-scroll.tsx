"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { useDirSign, useMediaQuery } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

type HorizontalScrollProps = {
  children: ReactNode
  className?: string
  trackClassName?: string
  /** Optional heading block that stays pinned above the moving track. */
  header?: ReactNode
}

/**
 * Desktop: the section pins and vertical scrolling slides the track sideways
 * (the other way round in RTL). Touch, small screens and reduced motion get a
 * native swipeable row with scroll snapping instead.
 */
export function HorizontalScroll({ children, className, trackClassName, header }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const sign = useDirSign()
  const desktop = useMediaQuery("(min-width: 1024px) and (hover: hover)")
  const reduceMotion = useReducedMotion()
  const pinned = desktop && !reduceMotion
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!pinned || !track) return
    const measure = () => setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [pinned])

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance * sign])

  return (
    <section
      ref={sectionRef}
      className={cn("relative", className)}
      style={pinned && distance ? { height: `calc(100svh + ${distance}px)` } : undefined}
    >
      <div className={cn(pinned && "sticky top-0 flex h-svh flex-col justify-center overflow-hidden")}>
        {header}
        <motion.div
          ref={trackRef}
          style={pinned ? { x } : undefined}
          className={cn(
            "flex gap-6 px-5 md:px-12",
            pinned
              ? "w-max will-change-transform"
              : "snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:none] *:snap-start",
            trackClassName,
          )}
          data-lenis-prevent-horizontal
        >
          {children}
        </motion.div>
      </div>
    </section>
  )
}
