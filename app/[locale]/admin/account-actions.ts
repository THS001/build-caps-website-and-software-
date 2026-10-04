"use server"

import { attempt, attemptForm } from "@/lib/action-result"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config"
import { currentStaff, serverClient, type StaffRole } from "@/lib/supabase/server"
import { rateLimited } from "@/lib/security"
import type { FormState } from "./actions"

// Passwords and staff logins, managed from Admin → My account.

const password = z.string().min(10, "Use at least 10 characters").max(72, "Use at most 72 characters")
const ROLES = ["admin", "editor", "advisor"] as const

/** Changes the signed-in user's password after checking the current one. */
export async function changeOwnPassword(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    const staff = await currentStaff()
    if (!staff) return { status: "error", message: "Please sign in again." }
    if (await rateLimited("password-change", 5, 15 * 60_000)) return { status: "error", message: "Too many attempts. Try again in 15 minutes." }

    const parsed = z
      .object({ current: z.string().min(1, "Enter your current password"), next: password, confirm: z.string() })
      .refine((d) => d.next === d.confirm, { message: "The new passwords don't match", path: ["confirm"] })
      .refine((d) => d.next !== d.current, { message: "Choose a password you haven't used here", path: ["next"] })
      .safeParse(Object.fromEntries(form))
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message
      return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
    }

    // Check the current password with a separate, throwaway session.
    const check = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: wrong } = await check.auth.signInWithPassword({ email: staff.email, password: parsed.data.current })
    if (wrong) return { status: "error", message: "Your current password isn't right.", fieldErrors: { current: "Incorrect password" } }
    await check.auth.signOut({ scope: "local" })

    const supabase = await serverClient()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.next })
    if (error) return { status: "error", message: error.message }
    return { status: "done", message: "Password changed. Use the new one next time you sign in." }
  })
}

/* ── Staff logins (admins only) ────────────────────────────────────────── */

async function requireAdmin() {
  const staff = await currentStaff()
  if (!staff || staff.role !== "admin") throw new Error("Only admins can manage staff logins.")
  return staff
}

async function admin() {
  const { adminClient } = await import("@/lib/supabase/admin")
  return adminClient()
}

/** Adds a staff login with a temporary password, or gives an existing login a role. */
export async function addStaff(_: FormState, form: FormData): Promise<FormState> {
  return attemptForm(async () => {
    await requireAdmin()
    const parsed = z
      .object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(2).max(120), role: z.enum(ROLES), password })
      .safeParse(Object.fromEntries(form))
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message
      return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
    }
    const { email, name, role } = parsed.data
    const supabase = await admin()
    const { data: created, error } = await supabase.auth.admin.createUser({ email, password: parsed.data.password, email_confirm: true, user_metadata: { full_name: name } })
    let userId = created?.user?.id
    if (error) {
      // Already has a login: find it and just set the role.
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id
      if (!userId) return { status: "error", message: error.message }
    }
    const { error: roleError } = await supabase.from("profiles").upsert({ id: userId, role, full_name: name }, { onConflict: "id" })
    if (roleError) return { status: "error", message: roleError.message }
    revalidatePath("/[locale]/admin/account", "page")
    return { status: "done", message: error ? `${email} already had a login; it is now ${role}.` : `Login created for ${email}. Give them the temporary password; they can change it in My account.` }
  })
}

/** Changes a staff member's role, or removes their access (null). The last admin can't be removed. */
export async function setStaffRole(userId: string, role: StaffRole | null) {
  return attempt(async () => {
    const me = await requireAdmin()
    z.string().uuid().parse(userId)
    if (role !== null) z.enum(ROLES).parse(role)
    const supabase = await admin()
    if (role !== "admin") {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")
      if ((admins ?? []).every((a) => a.id === userId)) throw new Error("There must always be at least one admin.")
      if (userId === me.id && role === null) throw new Error("You can't remove your own access.")
    }
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin/account", "page")
  })
}

/** Sets a temporary password for a staff member who forgot theirs. */
export async function resetStaffPassword(userId: string, newPassword: string) {
  return attempt(async () => {
    await requireAdmin()
    z.string().uuid().parse(userId)
    const pw = password.parse(newPassword)
    const supabase = await admin()
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: pw })
    if (error) throw new Error(error.message)
  })
}
