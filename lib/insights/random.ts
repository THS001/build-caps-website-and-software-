// Seeded randomness for the simulations, so the same inputs always give the
// same answer (and server and client agree).

/** mulberry32: small, fast, good enough for Monte Carlo. Returns [0, 1). */
export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal draw (Box–Muller). */
export function normal(rand: () => number) {
  let u = 0
  while (u === 0) u = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

/** Percentile of an ascending-sorted array, linear interpolation. */
export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
export function normalCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2)
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** One year of lognormal growth with the given expected rate and volatility. */
export const growthStep = (expected: number, vol: number, z: number) => Math.exp(Math.log(1 + expected) - (vol * vol) / 2 + vol * z)
