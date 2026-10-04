import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { MotionLab } from "@/components/motion-lab/motion-lab"

// Development showcase for the motion primitives (M4). Never served in production.
export const metadata: Metadata = { title: "Motion lab", robots: { index: false, follow: false } }

export default async function MotionLabPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const { locale } = await params
  setRequestLocale(locale)
  return <MotionLab />
}
