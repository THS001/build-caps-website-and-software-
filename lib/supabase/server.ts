import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

/** Cookie-based client for the admin (server components and server actions). Acts as the signed-in staff member. */
export async function serverClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server components can't set cookies; the middleware refreshes the session instead.
        }
      },
    },
  })
}

export type StaffRole = "admin" | "editor" | "advisor"

/** The signed-in user and their staff role, or null when signed out or without a role. */
export async function currentStaff() {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (!data?.role) return null
  return { id: user.id, email: user.email ?? "", name: (data.full_name as string | null) ?? user.email ?? "", role: data.role as StaffRole }
}
