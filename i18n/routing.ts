import { defineRouting } from "next-intl/routing"
import { defaultLocale, locales } from "./locales"

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English stays at the root ("/about") so old buildcaps.com URLs map 1:1;
  // every other language is prefixed ("/ar/about").
  localePrefix: "as-needed",
})
