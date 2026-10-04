import type { Metadata } from "next"
import { SkylineArt } from "@/components/art/skyline-art"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { TransitionLink } from "@/components/motion/view-transitions"
import { labListings } from "@/components/motion-lab/lab-data"

// Target page for the shared-element (card image → hero) transition test. Development only.
export const metadata: Metadata = { title: "Motion lab detail", robots: { index: false, follow: false } }

export default async function MotionLabDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const { locale, slug } = await params
  setRequestLocale(locale)
  const listing = labListings.find((l) => l.slug === slug)
  if (!listing) notFound()

  return (
    <main id="main" className="pt-24">
      <div className="container-custom">
        <TransitionLink href="/motion-lab" className="mb-6 inline-block text-sm text-neutral-600 hover:text-neutral-900">
          ← Motion lab
        </TransitionLink>
        <div
          className="relative aspect-[16/9] overflow-hidden rounded-3xl"
          style={{ viewTransitionName: `listing-${listing.slug}` }}
        >
          <SkylineArt seed={listing.slug} waterfront className="h-full w-full" title={listing.title} />
        </div>
        <h1 className="mt-8 text-4xl font-semibold text-neutral-900">{listing.title}</h1>
        <p className="mt-2 mb-24 text-neutral-600">{listing.community}</p>
      </div>
    </main>
  )
}
