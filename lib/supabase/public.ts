import "server-only"
import { createClient } from "@supabase/supabase-js"
import { CONTENT_TAG, supabaseAnonKey, supabaseUrl } from "./config"

/**
 * Anonymous client for public pages: reads published content (RLS) and inserts
 * leads and funnel clicks. No cookies, so pages stay statically renderable;
 * reads are cached for 5 minutes and dropped instantly when the admin saves.
 */
export function publicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags: [CONTENT_TAG] } }),
    },
  })
}

/** Same, without caching: for writes (leads, clicks) that must always reach the database. */
export function publicWriteClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  })
}
