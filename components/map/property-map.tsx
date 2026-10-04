"use client"

import { useEffect, useRef } from "react"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"

export type MapPin = { id: string; lat: number; lng: number; label: string; href?: string }

// Free vector tiles, no API key (OpenFreeMap). The RTL plugin shapes Arabic street labels.
const STYLE = "https://tiles.openfreemap.org/styles/positron"
const RTL_PLUGIN = "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.4.0/dist/mapbox-gl-rtl-text.js"
const DUBAI: [number, number] = [55.22, 25.14]
// Same-origin copy made by scripts/copy-maplibre-worker.mjs (bundlers don't emit MapLibre's worker).
const WORKER = "/maplibre/maplibre-gl-worker.mjs"

type PropertyMapProps = {
  pins: MapPin[]
  className?: string
  zoom?: number
  /** Accessible description of what the map shows. */
  label: string
}

/** MapLibre map with price pins. Loaded on demand, so it costs nothing until someone opens a map. */
export function PropertyMap({ pins, className, zoom = 10.4, label }: PropertyMapProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined
    let cancelled = false

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !container.current) return
      maplibregl.setWorkerUrl(WORKER)
      if (maplibregl.getRTLTextPluginStatus() === "unavailable") maplibregl.setRTLTextPlugin(RTL_PLUGIN, true)

      const instance = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: pins.length === 1 ? [pins[0].lng, pins[0].lat] : DUBAI,
        zoom: pins.length === 1 ? 13.5 : zoom,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      })
      map = instance
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

      for (const pin of pins) {
        const el = document.createElement(pin.href ? "a" : "div")
        if (pin.href) (el as HTMLAnchorElement).href = pin.href
        el.className = "map-pin"
        el.textContent = pin.label
        new maplibregl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(instance)
      }

      if (pins.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        pins.forEach((pin) => bounds.extend([pin.lng, pin.lat]))
        instance.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 })
      }
    })

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [pins, zoom])

  return <div ref={container} role="region" aria-label={label} className={cn("overflow-hidden rounded-3xl bg-sand-100", className)} data-lenis-prevent />
}
