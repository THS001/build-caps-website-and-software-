// Company facts used across the site. Taken from buildcaps.com (2026-10-03).
// RERA ORN / BRN numbers are still to come from the client; keep them null
// until then so nothing unverified is ever rendered.

export const site = {
  name: "Buildcaps Real Estate",
  legalName: "Buildcaps Real Estate LLC",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildcaps.com",
  email: "info@buildcaps.com",
  phones: [
    { href: "tel:+971582609991", display: "+971 58 260 9991" },
    { href: "tel:+97144500018", display: "+971 4 450 0018" },
  ],
  whatsapp: "971582609991",
  orn: null as string | null,
  geo: { lat: 25.2252, lng: 55.2838 }, // Conrad Office Tower, Sheikh Zayed Road
  social: [
    { name: "Instagram", href: "https://www.instagram.com/buildcaps" },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/buildcaps-real-estate/" },
    { name: "Facebook", href: "https://www.facebook.com/Buildcaps-Management-Services-116589511038569/" },
    { name: "X", href: "https://x.com/buildcaps" },
  ],
} as const

/** Click-to-chat link (free; no WhatsApp Business API needed). */
export function whatsappUrl(text?: string) {
  return `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
