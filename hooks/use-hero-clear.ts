"use client"

import { useEffect, useState } from "react"
import { usePathname } from "@/i18n/navigation"

/**
 * True while the home hero fills the screen, so floating buttons stay out of
 * it (nothing sits on the headline, search or wordmark). They fade in once the
 * visitor scrolls a little.
 */
export function useHeroClear() {
  const pathname = usePathname()
  const home = pathname === "/"
  const [clear, setClear] = useState(home)
  useEffect(() => {
    if (!home) return setClear(false)
    const update = () => setClear(window.scrollY < window.innerHeight * 0.4)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [home])
  return clear
}
