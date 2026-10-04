// A small, dependency-free confetti burst in Buildcaps colours, used once on a confirmed booking.

const COLORS = ["#b76e79", "#d4a1a8", "#f6e9eb", "#8f4f5a", "#004274", "#f0ede7"]
const GRAVITY = 0.22
const DRAG = 0.985
const MAX_MS = 3500

type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; alpha: number }

/** Bursts confetti from a point given as fractions of the viewport (0.5, 0.6 = just below centre). */
export function fireConfetti({ x = 0.5, y = 0.6, count = 110 }: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" })
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas.remove()
  ctx.scale(dpr, dpr)

  const originX = window.innerWidth * x
  const originY = window.innerHeight * y
  const pieces: Piece[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 7 + Math.random() * 9
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
    }
  })

  const start = performance.now()
  const frame = (now: number) => {
    const elapsed = now - start
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const p of pieces) {
      p.vx *= DRAG
      p.vy = p.vy * DRAG + GRAVITY
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.alpha = Math.max(0, 1 - elapsed / MAX_MS)
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (elapsed < MAX_MS) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
