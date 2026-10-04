import Link from "next/link"
import { Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"

const roleLabel: Record<string, string> = { propertyAdvisor: "Property advisor", seniorPropertyAdvisor: "Senior property advisor", salesDirector: "Sales director", ceo: "CEO" }

export default async function AdminTeam() {
  const supabase = await serverClient()
  const [{ data: agents, error }, { data: hours }] = await Promise.all([
    supabase.from("agents").select("slug, name, role, languages, email, brn, active, user_id, photo_url").order("sort_order"),
    supabase.from("agent_hours").select("agent_slug"),
  ])
  const withHours = new Set((hours ?? []).map((h) => h.agent_slug))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Team</h1>
        <Link href="/admin/team/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Add advisor
        </Link>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">Active advisors appear on the team page, take website bookings (except the CEO) and can own CRM contacts. Set their hours in Availability.</p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Advisor</th>
              <th className="px-4 py-3 text-start font-medium">Languages</th>
              <th className="px-4 py-3 text-start font-medium">Booking email</th>
              <th className="px-4 py-3 text-start font-medium">BRN</th>
              <th className="px-4 py-3 text-start font-medium">Hours</th>
              <th className="px-4 py-3 text-start font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(agents ?? []).map((a) => (
              <tr key={a.slug} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/team/${a.slug}`} className="font-medium text-neutral-900 hover:text-rose-700">
                    {a.name}
                  </Link>
                  <span className="block text-xs text-neutral-500">
                    {roleLabel[a.role] ?? a.role}
                    {!a.user_id && " · no staff login linked"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-700">{(a.languages as string[]).map((l) => l.toUpperCase()).join(" ")}</td>
                <td className={`px-4 py-3 ${a.email ? "text-neutral-700" : "text-amber-700"}`}>{a.email ?? "Missing"}</td>
                <td className={`px-4 py-3 ${a.brn ? "text-neutral-700" : "text-neutral-400"}`}>{a.brn ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-700">{a.role === "ceo" ? "Not bookable" : withHours.has(a.slug) ? "Custom" : "Default (Mon–Sat 9–7)"}</td>
                <td className="px-4 py-3">{a.active ? <span className="text-emerald-700">Active</span> : <span className="text-neutral-400">Hidden</span>}</td>
              </tr>
            ))}
            {!agents?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No advisors yet. Add your team so visitors can book them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
