"use client"

import dynamic from "next/dynamic"

/** The map bundle (MapLibre, ~250 KB gzipped) only downloads when a map is actually rendered. */
export const LazyPropertyMap = dynamic(() => import("./property-map").then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-sand-100" />,
})
