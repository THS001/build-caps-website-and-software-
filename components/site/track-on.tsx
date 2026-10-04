"use client"

import { useEffect, useRef } from "react"
import { track, type TrackEvent } from "@/lib/track"

/** Sends a conversion event once, when `when` turns true (e.g. a form's success state). */
export function TrackOn({ when, event, params }: { when: boolean; event: TrackEvent; params?: Record<string, string | number | undefined> }) {
  const sent = useRef(false)
  useEffect(() => {
    if (when && !sent.current) {
      sent.current = true
      track(event, params)
    }
    if (!when) sent.current = false
  }, [when, event, params])
  return null
}
