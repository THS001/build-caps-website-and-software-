"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Lenis from "lenis"
import { useReducedMotion } from "framer-motion"

const LenisContext = createContext<Lenis | null>(null)

/** The active Lenis instance, or null when smoothing is off (reduced motion, before mount). */
export function useLenis() {
  return useContext(LenisContext)
}

/**
 * Lenis smooth wheel scrolling. Touch keeps native scrolling, and visitors who
 * prefer reduced motion get plain scrolling. Lenis drives the real window scroll,
 * so framer-motion's useScroll and CSS position: sticky keep working.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (reduceMotion) return

    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.12,
      anchors: { offset: -96 },
      allowNestedScroll: true,
      // Menus, dialogs and anything marked data-lenis-prevent scroll natively.
      prevent: (node) => !!node.closest?.('[data-lenis-prevent], [role="dialog"], [role="menu"], [role="listbox"]'),
    })

    // Radix modals lock the page through react-remove-scroll, which marks <body>.
    const syncLock = () => (document.body.hasAttribute("data-scroll-locked") ? instance.stop() : instance.start())
    const observer = new MutationObserver(syncLock)
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] })

    setLenis(instance)
    return () => {
      observer.disconnect()
      instance.destroy()
      setLenis(null)
    }
  }, [reduceMotion])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}
