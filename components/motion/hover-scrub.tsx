"use client"

import { useState, type PointerEvent } from "react"
import Image from "next/image"
import { useFinePointer, useDirSign } from "@/hooks/use-motion-env"
import { cn } from "@/lib/utils"

type HoverScrubProps = {
  images: { src: string; alt: string }[]
  sizes: string
  className?: string
  priority?: boolean
}

/**
 * Listing-card gallery: moving the cursor across the card flips through the
 * photos, with segment bars showing where you are. Touch shows the cover photo.
 */
export function HoverScrub({ images, sizes, className, priority }: HoverScrubProps) {
  const finePointer = useFinePointer()
  const sign = useDirSign()
  const [index, setIndex] = useState(0)
  const [warm, setWarm] = useState(false)

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    let ratio = (event.clientX - rect.left) / rect.width
    if (sign === -1) ratio = 1 - ratio
    setIndex(Math.min(images.length - 1, Math.max(0, Math.floor(ratio * images.length))))
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={finePointer ? () => setWarm(true) : undefined}
      onPointerMove={finePointer ? handleMove : undefined}
      onPointerLeave={finePointer ? () => setIndex(0) : undefined}
    >
      {images.map((image, i) =>
        // The cover renders immediately; the rest mount on first hover so cards stay light.
        i === 0 || warm ? (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            priority={priority && i === 0}
            className={cn("object-cover transition-opacity duration-300", i === index ? "opacity-100" : "opacity-0")}
          />
        ) : null,
      )}

      {images.length > 1 && (
        <div aria-hidden className="absolute inset-x-3 bottom-3 z-10 flex gap-1">
          {images.map((image, i) => (
            <span
              key={image.src}
              className={cn("h-0.5 flex-1 rounded-full transition-colors", i === index ? "bg-white" : "bg-white/40")}
            />
          ))}
        </div>
      )}
    </div>
  )
}
