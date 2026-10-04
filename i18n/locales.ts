export const locales = ["en", "ar", "ru", "zh", "hi", "fr", "de", "it", "ur", "fa"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const rtlLocales: readonly Locale[] = ["ar", "ur", "fa"]

export function isRtl(locale: string) {
  return (rtlLocales as readonly string[]).includes(locale)
}

/** Shown in the language switcher, always in the language's own script. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ru: "Русский",
  zh: "中文",
  hi: "हिन्दी",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ur: "اردو",
  fa: "فارسی",
}

/** BCP 47 tags for hreflang, Intl formatting and Open Graph. */
export const localeTags: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE",
  ru: "ru-RU",
  zh: "zh-CN",
  hi: "hi-IN",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  ur: "ur-PK",
  fa: "fa-IR",
}

/**
 * Scripts that must not be split per character in text animations:
 * Arabic-script letters join, and Devanagari conjuncts span several code points.
 */
export const wordAnimatedLocales: readonly Locale[] = ["ar", "ur", "fa", "hi"]
