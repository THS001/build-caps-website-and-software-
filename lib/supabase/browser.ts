"use client"

import { createBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

/** Browser client for the admin (sign-in, direct uploads to the media bucket). */
export function browserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
