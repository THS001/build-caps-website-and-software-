"use client"

import { useState } from "react"
import { SkylineArt } from "@/components/art/skyline-art"
import { ArrowRight } from "lucide-react"
import { Area, Price } from "@/components/price"
import { ClipReveal } from "@/components/motion/clip-reveal"
import { CountUp } from "@/components/motion/count-up"
import { fireConfetti } from "@/components/motion/confetti"
import { FlipCard } from "@/components/motion/flip-card"
import { HorizontalScroll } from "@/components/motion/horizontal-scroll"
import { Magnetic } from "@/components/motion/magnetic"
import { MediaCursor } from "@/components/motion/media-cursor"
import { Ripple } from "@/components/motion/ripple"
import { StackedDeck } from "@/components/motion/stacked-deck"
import { StepTransition } from "@/components/motion/step-transition"
import { TextScrub } from "@/components/motion/text-scrub"
import { TiltCard } from "@/components/motion/tilt-card"
import { TransitionLink } from "@/components/motion/view-transitions"
import { RiseOfDubai } from "@/components/home/rise-of-dubai"
import { labListings, labMilestones } from "./lab-data"

function LabSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="container-custom py-20">
      <p className="text-label mb-6 text-rose-700">{title}</p>
      {children}
    </section>
  )
}

const steps = ["Purpose", "Mode", "Advisor", "Time", "Details"]

export function MotionLab() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const go = (delta: 1 | -1) => {
    setDirection(delta)
    setStep((s) => Math.min(steps.length - 1, Math.max(0, s + delta)))
  }

  return (
    <main id="main" className="pt-20">
      <LabSection id="text" title="Text scrub">
        <TextScrub
          className="max-w-4xl text-3xl font-medium leading-snug text-neutral-900 md:text-5xl"
          text="Dubai rewards investors who move with data. Every listing here shows its permit, its real yield and the developer's delivery record, so you can check us instead of trusting us."
        />
      </LabSection>

      <LabSection id="cards" title="Tilt + hover scrub + shimmer + shared element">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {labListings.map((listing) => (
            <TiltCard key={listing.slug} className="rounded-3xl">
              <TransitionLink href={`/motion-lab/${listing.slug}`} className="block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200">
                <div style={{ viewTransitionName: `listing-${listing.slug}` }}>
                  <SkylineArt seed={listing.slug} waterfront className="aspect-[4/5] w-full" />
                </div>
                <div className="space-y-1 p-5">
                  <span className="badge-shimmer inline-block rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                    {listing.badge}
                  </span>
                  <p className="pt-2 text-lg font-semibold text-neutral-900">{listing.title}</p>
                  <p className="text-sm text-neutral-500">{listing.community}</p>
                  <p className="pt-2 text-xl font-semibold text-neutral-900">
                    <Price aed={listing.aed} />
                  </p>
                  <Area sqft={listing.sqft} className="text-sm text-neutral-600" />
                </div>
              </TransitionLink>
            </TiltCard>
          ))}
        </div>
      </LabSection>

      <LabSection id="reveal" title="Clip reveal + media cursor">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ClipReveal className="aspect-[4/3] rounded-3xl">
            <SkylineArt seed="lab-reveal-1" mood="dusk" className="h-full w-full" />
          </ClipReveal>
          <MediaCursor label="View" className="aspect-[4/3] overflow-hidden rounded-3xl">
            <ClipReveal from="bottom" delay={0.15} className="h-full">
              <SkylineArt seed="lab-reveal-2" mood="night" waterfront className="h-full w-full" />
            </ClipReveal>
          </MediaCursor>
        </div>
      </LabSection>

      <LabSection id="stats" title="Count up">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <CountUp value={2_450_000} format={{ style: "currency", currency: "AED", currencyDisplay: "code", notation: "compact", maximumFractionDigits: 2 }} className="text-4xl font-bold text-neutral-900" />
            <p className="text-sm text-neutral-500">Average ticket</p>
          </div>
          <div>
            <CountUp value={0.072} format={{ style: "percent", maximumFractionDigits: 1 }} className="text-4xl font-bold text-neutral-900" />
            <p className="text-sm text-neutral-500">Gross yield</p>
          </div>
          <div>
            <CountUp value={68} className="text-4xl font-bold text-neutral-900" />
            <p className="text-sm text-neutral-500">Nationalities</p>
          </div>
          <div>
            <CountUp value={15} className="text-4xl font-bold text-neutral-900" />
            <p className="text-sm text-neutral-500">Years</p>
          </div>
        </div>
      </LabSection>

      <LabSection id="cta" title="Magnetic + ripple">
        <div className="flex flex-wrap gap-6">
          <Magnetic>
            <button className="glow-rose relative overflow-hidden rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white">
              Book a free strategy call
              <Ripple />
            </button>
          </Magnetic>
          <Magnetic strength={0.2}>
            <button
              onClick={() => fireConfetti()}
              className="border-gradient relative overflow-hidden rounded-full bg-white px-8 py-4 font-semibold text-neutral-900"
            >
              Confetti
              <Ripple color="rgb(183 110 121 / 0.25)" />
            </button>
          </Magnetic>
        </div>
      </LabSection>

      <RiseOfDubai eyebrow="Rise of Dubai" title="A skyline built on long-term plans" milestones={labMilestones} />

      <HorizontalScroll
        className="bg-neutral-50"
        header={
          <div className="container-custom mb-10">
            <p className="text-label text-rose-700">Horizontal scroll</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">New launches</p>
          </div>
        }
      >
        {[...labListings, ...labListings].map((listing, i) => (
          <article key={`${listing.slug}-${i}`} className="w-[78vw] shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200 sm:w-[420px]">
            <div className="relative aspect-[16/10]">
              <SkylineArt seed={`${listing.slug}-${i}`} className="h-full w-full" />
            </div>
            <div className="p-5">
              <p className="font-semibold text-neutral-900">{listing.title}</p>
              <Price aed={listing.aed} className="text-sm text-neutral-600" />
            </div>
          </article>
        ))}
      </HorizontalScroll>

      <LabSection id="deck" title="Stacked deck + flip cards">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <StackedDeck>
            {labListings.map((listing) => (
              <div key={listing.slug} className="relative h-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
                <SkylineArt seed={`deck-${listing.slug}`} mood="dusk" className="h-full w-full" />
              </div>
            ))}
          </StackedDeck>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {labListings.slice(0, 2).map((listing) => (
              <FlipCard
                key={listing.slug}
                label="Show key numbers"
                className="aspect-[3/4] rounded-3xl"
                front={
                  <div className="relative h-full overflow-hidden rounded-3xl">
                    <SkylineArt seed={`flip-${listing.slug}`} mood="night" className="h-full w-full" />
                    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-5 font-semibold text-white">{listing.title}</p>
                  </div>
                }
                back={
                  <div className="flex h-full flex-col justify-between rounded-3xl bg-navy-900 p-6 text-white">
                    <p className="text-label text-rose-300">Key numbers</p>
                    <div className="space-y-3">
                      <Price aed={listing.aed} className="block text-3xl font-bold" approxClassName="text-white" />
                      <p className="text-sm text-white/70">20% down, 80% on handover</p>
                    </div>
                    <span className="flex items-center gap-2 font-semibold text-rose-300">
                      View offer <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      </LabSection>

      <LabSection id="steps" title="Step transition">
        <div className="max-w-xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
          <StepTransition stepKey={step} direction={direction}>
            <p className="text-sm text-neutral-500">
              Step {step + 1} of {steps.length}
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{steps[step]}</p>
          </StepTransition>
          <div className="mt-8 flex justify-between">
            <button onClick={() => go(-1)} disabled={step === 0} className="rounded-full px-5 py-2 text-sm font-medium ring-1 ring-neutral-300 disabled:opacity-40">
              Back
            </button>
            <button
              onClick={() => (step === steps.length - 1 ? fireConfetti() : go(1))}
              className="relative overflow-hidden rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white"
            >
              {step === steps.length - 1 ? "Confirm" : "Next"}
              <Ripple />
            </button>
          </div>
        </div>
      </LabSection>
    </main>
  )
}
