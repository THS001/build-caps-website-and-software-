import { Building2, HandCoins, Home, KeyRound, Landmark, Scale } from "lucide-react"

/** Service pages: URL slug, message key under `services`, the booking purpose they pre-fill, and the enquiry interest. */
export const services = [
  { slug: "buy", key: "buy", icon: Home, purpose: "strategy", interest: "buy" },
  { slug: "sell", key: "sell", icon: HandCoins, purpose: "valuation", interest: "sell" },
  { slug: "rent", key: "rent", icon: KeyRound, purpose: "viewing", interest: "rent" },
  { slug: "property-management", key: "propertyManagement", icon: Building2, purpose: "strategy", interest: "general" },
  { slug: "mortgage", key: "mortgage", icon: Landmark, purpose: "mortgage", interest: "mortgage" },
  { slug: "valuation", key: "valuation", icon: Scale, purpose: "valuation", interest: "valuation" },
] as const
