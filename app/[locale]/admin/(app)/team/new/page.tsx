import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { AgentForm } from "@/components/admin/agent-form"

export default async function NewAgent() {
  const supabase = await serverClient()
  const { data: staff } = await supabase.from("profiles").select("id, full_name, role").not("role", "is", null)
  return (
    <div>
      <Link href="/admin/team" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Team
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Add an advisor</h1>
      <div className="mt-8">
        <AgentForm agent={null} staff={(staff ?? []).map((s) => ({ id: s.id, name: s.full_name ?? "Staff", role: s.role }))} />
      </div>
    </div>
  )
}
