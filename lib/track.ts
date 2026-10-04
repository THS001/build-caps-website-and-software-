// Conversion events for GA4, Meta and TikTok. Each call is a no-op unless the
// visitor consented and the matching script loaded (components/site/analytics.tsx).

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    gtag?: Gtag
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void; page: () => void }
  }
}

export type TrackEvent = "lead" | "booking" | "whatsapp" | "call" | "funnel_click" | "tool_use"

const meta: Partial<Record<TrackEvent, string>> = { lead: "Lead", booking: "Schedule", whatsapp: "Contact", call: "Contact" }
const tiktok: Partial<Record<TrackEvent, string>> = { lead: "SubmitForm", booking: "PlaceAnOrder", whatsapp: "Contact", call: "Contact" }
const ga: Record<TrackEvent, string> = { lead: "generate_lead", booking: "book_appointment", whatsapp: "contact_whatsapp", call: "contact_call", funnel_click: "select_promotion", tool_use: "use_tool" }

export function track(event: TrackEvent, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return
  window.gtag?.("event", ga[event], params)
  if (meta[event]) window.fbq?.("track", meta[event], params)
  if (tiktok[event]) window.ttq?.track(tiktok[event]!, params)
}
