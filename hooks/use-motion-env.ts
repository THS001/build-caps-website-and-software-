"use client"

import { useSyncExternalStore } from "react"
import { useDirection } from "@radix-ui/react-direction"

// One stable subscribe function per query, so useSyncExternalStore doesn't resubscribe every render.
const subscribers = new Map<string, (onChange: () => void) => () => void>()

function subscribeTo(query: string) {
  let subscribe = subscribers.get(query)
  if (!subscribe) {
    subscribe = (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }
    subscribers.set(query, subscribe)
  }
  return subscribe
}

/** Live media-query match. The server snapshot is `false`, so effects gated on it start after hydration. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mouse or trackpad: hover effects (tilt, magnetic, cursor follower) only run here, never on touch. */
export function useFinePointer() {
  return useMediaQuery("(hover: hover) and (pointer: fine)")
}

/** 1 for left-to-right, -1 for right-to-left: multiply horizontal motion by it so it mirrors in RTL. */
export function useDirSign() {
  return useDirection() === "rtl" ? -1 : 1
}
