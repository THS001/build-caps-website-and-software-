import "server-only"
import { createClient } from "@supabase/supabase-js"
import { supabaseConfigured, supabaseUrl } from "./config"

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

/**
 * Trusted server-side access (bookings, reminders, AI agents). Bypasses RLS, so
 * it is only ever used in server actions, route handlers and cron jobs, and the
 * key never leaves the server (no NEXT_PUBLIC_ prefix).
 */
export const adminConfigured = supabaseConfigured && Boolean(serviceKey)

export function adminClient() {
  if (!adminConfigured) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  })
}
