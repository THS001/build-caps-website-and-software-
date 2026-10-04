import "server-only"
import { headers } from "next/headers"

// Anti-abuse for public forms: Cloudflare Turnstile (free) and a per-IP rate limit.

const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? ""
export const turnstileConfigured = Boolean(turnstileSecret && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

export async function clientIp() {
  const h = await headers()
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}

/** Verifies a Turnstile token. Passes when Turnstile isn't configured (development). */
export async function verifyHuman(token: FormDataEntryValue | string | null | undefined) {
  if (!turnstileConfigured) return true
  if (!token || typeof token !== "string") return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: await clientIp() }),
      cache: "no-store",
    })
    const data = (await res.json()) as { success: boolean }
    return data.success
  } catch {
    return false
  }
}

// Sliding-window limiter per server instance. Turnstile is the main defence;
// this only blunts bursts from one address.
const hits = new Map<string, number[]>()

export async function rateLimited(bucket: string, limit: number, windowMs: number) {
  const key = `${bucket}:${await clientIp()}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 10_000) hits.clear()
  return recent.length > limit
}
