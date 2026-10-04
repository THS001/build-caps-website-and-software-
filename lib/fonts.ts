import {
  IBM_Plex_Sans_Arabic,
  Inter,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Devanagari,
  Noto_Sans_SC,
  Playfair_Display,
  Vazirmatn,
} from "next/font/google"
import type { Locale } from "@/i18n/locales"

// Only Inter is preloaded. The script fonts are declared on every page but a
// browser downloads them only when text in that script is actually rendered.
const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-inter" })

// Serif display face for the home hero headline (Latin and Cyrillic only).
const playfair = Playfair_Display({ subsets: ["latin", "cyrillic"], weight: ["400", "500"], style: ["normal", "italic"], display: "swap", variable: "--font-display" })

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-plex-arabic",
})

const vazirmatn = Vazirmatn({ subsets: ["arabic"], display: "swap", preload: false, variable: "--font-vazirmatn" })

const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], display: "swap", preload: false, variable: "--font-naskh" })

const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], display: "swap", preload: false, variable: "--font-nastaliq" })

const notoSC = Noto_Sans_SC({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-noto-sc" })

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
  variable: "--font-devanagari",
})

export const fontVariables = [inter, playfair, plexArabic, vazirmatn, naskh, nastaliq, notoSC, devanagari]
  .map((f) => f.variable)
  .join(" ")

const latin = "var(--font-inter), system-ui, sans-serif"

/** Body font stack per locale; Latin glyphs inside RTL/CJK text still use Inter. */
export const localeFontStack: Record<Locale, string> = {
  en: latin,
  ru: latin,
  fr: latin,
  de: latin,
  it: latin,
  ar: `var(--font-plex-arabic), ${latin}`,
  fa: `var(--font-vazirmatn), ${latin}`,
  ur: `var(--font-naskh), ${latin}`,
  zh: `var(--font-inter), var(--font-noto-sc), "PingFang SC", "Microsoft YaHei", sans-serif`,
  hi: `var(--font-inter), var(--font-devanagari), sans-serif`,
}
