import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

/**
 * Refreshes the staff session on admin requests, copying any refreshed auth
 * cookies onto the response the locale middleware already produced.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  // Validates the token with Supabase Auth (not just the cookie), refreshing it if needed.
  await supabase.auth.getUser()
  return response
}
