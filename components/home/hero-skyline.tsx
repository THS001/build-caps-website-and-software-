"use client"

import { motion, useTransform, type MotionValue } from "framer-motion"

// Three silhouette layers that drift apart as the hero scrolls away. Generated
// once (deterministic), drawn as plain SVG: no image request in the LCP path.

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Block = { x: number; w: number; h: number; spire: number }

function layer(seed: number, maxH: number, minH: number): Block[] {
  const rand = rng(seed)
  const out: Block[] = []
  for (let x = -20; x < 1620; ) {
    const w = 18 + rand() * 46
    out.push({ x, w, h: minH + rand() * (maxH - minH), spire: rand() > 0.85 ? 20 + rand() * 50 : 0 })
    x += w + 2 + rand() * 10
  }
  return out
}

const FAR = layer(11, 300, 90)
const MID = layer(23, 380, 120)
const NEAR = layer(37, 260, 70)
const GROUND = 900

// Burj Khalifa: stepped tiers and the needle, in the middle layer.
const BURJ = "M792 900 L792 520 L800 520 L800 420 L806 420 L806 330 L811 330 L811 250 L814 250 L815 120 L816 250 L819 250 L819 330 L824 330 L824 420 L830 420 L830 520 L838 520 L838 900 Z"

function Layer({ blocks, fill, y, windows }: { blocks: Block[]; fill: string; y: MotionValue<number>; windows?: boolean }) {
  return (
    <motion.svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" style={{ y }} aria-hidden>
      <g fill={fill}>
        {blocks.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />
            {b.spire > 0 && <rect x={b.x + b.w / 2 - 1.5} y={GROUND - b.h - b.spire} width={3} height={b.spire} />}
          </g>
        ))}
      </g>
      {windows && (
        <g fill="#f6c9a8" className="hero-windows">
          {blocks.flatMap((b, i) =>
            Array.from({ length: Math.floor(b.h / 22) }, (_, r) =>
              (i * 7 + r * 3) % 5 === 0 ? <rect key={`${i}-${r}`} x={b.x + 6 + ((r * 13) % Math.max(1, b.w - 14))} y={GROUND - b.h + 10 + r * 22} width={4} height={6} opacity={0.75} /> : null,
            ),
          )}
        </g>
      )}
    </motion.svg>
  )
}

export function HeroSkyline({ progress }: { progress: MotionValue<number> }) {
  const farY = useTransform(progress, [0, 1], [0, 60])
  const midY = useTransform(progress, [0, 1], [0, 140])
  const nearY = useTransform(progress, [0, 1], [0, 260])
  const sunY = useTransform(progress, [0, 1], [0, 220])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#00173f_0%,#2c2850_38%,#8f4f5a_68%,#d4a1a8_86%,#f6e9eb_100%)]">
      <motion.div
        aria-hidden
        className="absolute start-1/2 top-[52%] h-[46vmax] w-[46vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(251_233_236/0.9)_0%,rgb(212_161_168/0.35)_35%,transparent_70%)] rtl:translate-x-1/2"
        style={{ y: sunY }}
      />
      <Layer blocks={FAR} fill="#8f4f5a" y={farY} />
      <motion.svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" style={{ y: midY }} aria-hidden>
        <g fill="#3b2f4f">
          {MID.map((b, i) => (
            <rect key={i} x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />
          ))}
          <path d={BURJ} />
        </g>
      </motion.svg>
      <Layer blocks={NEAR} fill="#00173f" y={nearY} windows />
    </div>
  )
}
