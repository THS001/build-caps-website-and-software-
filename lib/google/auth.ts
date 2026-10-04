import "server-only"
import { createSign } from "node:crypto"

// Google service-account auth (OAuth 2.0 JWT bearer flow), without the googleapis SDK.
// GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY (PEM; "\n" escapes allowed).

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ""
const key = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n")

export const googleConfigured = Boolean(email && key)

const cache = new Map<string, { token: string; expires: number }>()

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url")

/**
 * Access token for the given scopes. `subject` impersonates a Workspace user,
 * which needs domain-wide delegation (required for Google Meet links and invites).
 */
export async function googleToken(scopes: string[], subject?: string) {
  if (!googleConfigured) throw new Error("Google service account is not configured")
  const cacheKey = `${scopes.join(" ")}|${subject ?? ""}`
  const hit = cache.get(cacheKey)
  if (hit && hit.expires > Date.now() + 60_000) return hit.token

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = b64url(
    JSON.stringify({ iss: email, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, ...(subject ? { sub: subject } : {}) }),
  )
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key).toString("base64url")

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cache.set(cacheKey, { token: data.access_token, expires: Date.now() + data.expires_in * 1000 })
  return data.access_token
}

export async function googleFetch<T>(url: string, scopes: string[], init: RequestInit & { subject?: string } = {}): Promise<T> {
  const { subject, ...rest } = init
  const token = await googleToken(scopes, subject)
  const res = await fetch(url, {
    ...rest,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(rest.headers ?? {}) },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Google API ${res.status} ${url}: ${await res.text()}`)
  return (res.status === 204 ? undefined : await res.json()) as T
}
