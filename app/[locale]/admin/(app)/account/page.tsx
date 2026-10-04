import { currentStaff } from "@/lib/supabase/server"
import { AddStaffForm, ChangePasswordForm, StaffRow } from "@/components/admin/account-forms"

const roleLabel = { admin: "Admin", editor: "Editor", advisor: "Advisor" } as const

export default async function MyAccount() {
  const me = await currentStaff()
  if (!me) return null

  // Admins also manage everyone's logins.
  let staff: { id: string; name: string; email: string; role: string; lastSignIn: string | null }[] = []
  if (me.role === "admin") {
    const { adminClient } = await import("@/lib/supabase/admin")
    const supabase = adminClient()
    const [{ data: profiles }, { data: users }] = await Promise.all([supabase.from("profiles").select("id, full_name, role").not("role", "is", null), supabase.auth.admin.listUsers({ perPage: 1000 })])
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u]))
    staff = (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Staff", email: byId.get(p.id)?.email ?? "", role: p.role, lastSignIn: byId.get(p.id)?.last_sign_in_at ?? null })).sort((a, b) => a.name.localeCompare(b.name))
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">My account</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {me.name} · {me.email} · {roleLabel[me.role]}
      </p>

      <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Change password</h2>
        <ChangePasswordForm />
      </section>

      {me.role === "admin" && (
        <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Staff logins</h2>
          <p className="mt-1 text-sm text-neutral-500">Everyone who can sign in to this admin. To show someone on the website and let clients book them, also add them in Team.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Person</th>
                  <th className="px-4 py-3 text-start font-medium">Role</th>
                  <th className="px-4 py-3 text-start font-medium">Last sign-in</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <StaffRow key={s.id} {...s} isMe={s.id === me.id} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <AddStaffForm />
          </div>
        </section>
      )}
    </div>
  )
}
