"use client"

import Image, { type ImageLoaderProps } from "next/image"
import type { StockPhoto } from "@/lib/media"
import { cn } from "@/lib/utils"

// Unsplash resizes and converts on its own CDN, so these never use our image quota.
const unsplashLoader = ({ src, width, quality }: ImageLoaderProps) => `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${width}&q=${quality ?? 72}`

type PhotoProps = {
  photo: StockPhoto
  /** Empty for decorative backgrounds (the default); pass true to use the photo's description. */
  alt?: string | true
  sizes?: string
  priority?: boolean
  className?: string
  quality?: number
}

/** A licensed stock photo filling its (relatively positioned) parent. */
export function Photo({ photo, alt = "", sizes = "100vw", priority, className, quality }: PhotoProps) {
  return (
    <Image
      loader={unsplashLoader}
      src={photo.id}
      alt={alt === true ? photo.alt : alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      className={cn("object-cover", className)}
    />
  )
}
