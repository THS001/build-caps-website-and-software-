// Cookie consent (UAE PDPL and GDPR). Nothing beyond strictly necessary storage
// runs until the visitor opts in; the choice is kept in a first-party cookie for
// six months and can be changed any time from "Cookie settings" in the footer.

export type Consent = { analytics: boolean; marketing: boolean; v: 1; at: string }

const COOKIE = "bc_consent"
const MAX_AGE = 60 * 60 * 24 * 182
export const CONSENT_CHANGED = "bc:consent"
export const OPEN_CONSENT = "bc:consent:open"

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))
  if (!raw) return null
  try {
    const value = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as Consent
    return value.v === 1 ? value : null
  } catch {
    return null
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }) {
  const value: Consent = { ...choice, v: 1, at: new Date().toISOString() }
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: value }))
}

export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_CONSENT))
