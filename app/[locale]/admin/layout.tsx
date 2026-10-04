import type { Metadata } from "next"
import type React from "react"

// Staff-only CMS. English only, never indexed, never cached.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" lang="en" className="min-h-svh bg-neutral-50">
      {children}
    </div>
  )
}
