// Procedural Dubai skyline illustrations in the brand palette. They stand in for
// photography until real listing and community photos arrive (M6), and are
// deterministic: the same seed always draws the same scene.

type Mood = "dusk" | "day" | "night" | "dawn"

const palettes: Record<Mood, { sky: string[]; glow: string; far: string; mid: string; near: string; window: string; water: string[] }> = {
  dusk: { sky: ["#00173f", "#5b3a5e", "#b76e79", "#f6e9eb"], glow: "#fbe9ec", far: "#8f4f5a", mid: "#3b2f4f", near: "#00173f", window: "#f6c9a8", water: ["#5b3a5e", "#00173f"] },
  day: { sky: ["#9fc1dc", "#cfe0ee", "#eef3f7", "#f0ede7"], glow: "#ffffff", far: "#b9c7d6", mid: "#6f8aa6", near: "#004274", window: "#dbe6f0", water: ["#9fc1dc", "#004274"] },
  night: { sky: ["#000b20", "#00173f", "#00264f", "#004274"], glow: "#d4a1a8", far: "#0c2d55", mid: "#071f42", near: "#000b20", window: "#f0d3a0", water: ["#00173f", "#000b20"] },
  dawn: { sky: ["#f6e9eb", "#f3dfe1", "#f0ede7", "#ffffff"], glow: "#ffffff", far: "#e2c4c9", mid: "#b98e98", near: "#5b3a5e", window: "#fff4e6", water: ["#f3dfe1", "#b98e98"] },
}

const moods: Mood[] = ["dusk", "day", "night", "dawn"]

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619)
  return h >>> 0
}

function random(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Tower = { x: number; w: number; h: number; spire: number; step: boolean }

function towers(rand: () => number, count: number, maxH: number, minH: number, lowRise: boolean): Tower[] {
  const list: Tower[] = []
  let x = -10
  for (let i = 0; i < count && x < 410; i++) {
    const w = lowRise ? 26 + rand() * 30 : 14 + rand() * 26
    const h = lowRise ? 18 + rand() * 26 : minH + rand() * (maxH - minH)
    list.push({ x, w, h, spire: !lowRise && rand() > 0.82 ? 10 + rand() * 30 : 0, step: !lowRise && rand() > 0.6 })
    x += w + (lowRise ? 4 + rand() * 6 : 1 + rand() * 6)
  }
  return list
}

type SkylineArtProps = {
  seed: string
  mood?: Mood
  waterfront?: boolean
  lowRise?: boolean
  className?: string
  title?: string
}

export function SkylineArt({ seed, mood, waterfront = false, lowRise = false, className, title }: SkylineArtProps) {
  const h = hash(seed)
  const rand = random(h)
  const m = mood ?? moods[h % moods.length]
  const p = palettes[m]
  const id = `sk${h.toString(36)}${m}`
  const ground = waterfront ? 228 : 262
  const lit = m === "night" || m === "dusk"
  const sunX = 60 + rand() * 280
  const sunY = m === "day" ? 70 : m === "night" ? 60 : 150

  const layers = [
    { list: towers(rand, 30, 150, 50, false), fill: p.far, opacity: 0.55, lift: 18 },
    { list: towers(rand, 26, lowRise ? 120 : 190, 40, false), fill: p.mid, opacity: 0.85, lift: 8 },
    { list: towers(rand, 22, lowRise ? 70 : 160, 25, lowRise), fill: p.near, opacity: 1, lift: 0 },
  ]
  const front = layers[2].list

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
          {p.sky.map((c, i) => (
            <stop key={c + i} offset={i / (p.sky.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={p.glow} stopOpacity="0.95" />
          <stop offset="0.35" stopColor={p.glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-water`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={p.water[0]} />
          <stop offset="1" stopColor={p.water[1]} />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy={sunY} r="90" fill={`url(#${id}-glow)`} />
      {m === "night" &&
        Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={rand() * 400} cy={rand() * 120} r={rand() * 0.9 + 0.2} fill="#fff" opacity={0.3 + rand() * 0.5} />
        ))}

      {layers.map((layer, li) => (
        <g key={li} fill={layer.fill} opacity={layer.opacity}>
          {layer.list.map((t, i) => {
            const top = ground - layer.lift - t.h
            return (
              <g key={i}>
                <rect x={t.x} y={top} width={t.w} height={t.h + layer.lift + 40} />
                {t.step && <rect x={t.x + t.w * 0.2} y={top - t.h * 0.12} width={t.w * 0.6} height={t.h * 0.12 + 1} />}
                {t.spire > 0 && <rect x={t.x + t.w / 2 - 1} y={top - t.spire} width={2} height={t.spire} />}
              </g>
            )
          })}
        </g>
      ))}

      {lit && (
        <g fill={p.window}>
          {front.flatMap((t, i) => {
            const top = ground - t.h
            const cols = Math.max(1, Math.floor(t.w / 7))
            const rows = Math.floor(t.h / 9)
            return Array.from({ length: cols * rows }, (_, k) => {
              if (rand() > 0.28) return null
              const c = k % cols
              const r = Math.floor(k / cols)
              return <rect key={`${i}-${k}`} x={t.x + 3 + c * 7} y={top + 5 + r * 9} width={2.4} height={3.2} opacity={0.55 + rand() * 0.45} />
            })
          })}
        </g>
      )}

      {waterfront && (
        <g>
          <rect y={ground} width="400" height={300 - ground} fill={`url(#${id}-water)`} />
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={rand() * 380} y={ground + 6 + rand() * (300 - ground - 10)} width={10 + rand() * 40} height={0.8} fill={p.glow} opacity={0.25 + rand() * 0.3} />
          ))}
        </g>
      )}
    </svg>
  )
}
