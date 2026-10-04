import "server-only"
import { cache } from "react"
import type { Locale } from "@/i18n/locales"
import { supabaseConfigured } from "@/lib/supabase/config"
import { publicClient } from "@/lib/supabase/public"

// What the SEO Growth Agent has changed on a page (seo_overrides): title and
// description for metadata, plus optional FAQ and related-links blocks.

export type SeoFaq = { q: string; a: string }[]
export type SeoLinks = { href: string; label: string }[]
export type SeoOverride = { title: string | null; description: string | null; faq: SeoFaq | null; links: SeoLinks | null }

export const getSeoOverride = cache(async (locale: Locale, pathname: string): Promise<SeoOverride | null> => {
  if (!supabaseConfigured) return null
  const { data } = await publicClient().from("seo_overrides").select("title, description, faq, links").eq("locale", locale).eq("pathname", pathname).maybeSingle()
  return (data as SeoOverride | null) ?? null
})
