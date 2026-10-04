"use client"

import { DirectionProvider } from "@radix-ui/react-direction"
import { MotionConfig } from "framer-motion"
import { PreferencesProvider } from "@/components/preferences-provider"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { ViewTransitions } from "@/components/motion/view-transitions"

/**
 * Client-side providers shared by every page. Radix reads direction from
 * context, not from <html dir>. MotionConfig "user" turns transform and layout
 * animations off for visitors who prefer reduced motion.
 */
export function Providers({ dir, children }: { dir: "ltr" | "rtl"; children: React.ReactNode }) {
  return (
    <DirectionProvider dir={dir}>
      <MotionConfig reducedMotion="user">
        <PreferencesProvider>
          <SmoothScroll>
            <ViewTransitions>{children}</ViewTransitions>
          </SmoothScroll>
        </PreferencesProvider>
      </MotionConfig>
    </DirectionProvider>
  )
}
