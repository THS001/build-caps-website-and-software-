import { serverClient } from "@/lib/supabase/server"
import { AppointmentActions } from "@/components/admin/appointment-actions"

const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })

export default async function AdminAppointments({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const past = view === "past"
  const supabase = await serverClient()
  const nowIso = new Date().toISOString()
  let query = supabase
    .from("appointments")
    .select("id, reference, purpose, mode, agent_slug, starts_at, name, email, phone, language, status, meeting_url, notes, property_slug")
    .limit(200)
  query = past ? query.lt("starts_at", nowIso).order("starts_at", { ascending: false }) : query.gte("starts_at", nowIso).order("starts_at")
  const [{ data, error }, { data: agents }] = await Promise.all([
    query,
    supabase.from("agents").select("slug, name").eq("active", true).neq("role", "ceo").order("sort_order"),
  ])

  const tab = (active: boolean) => `rounded-full px-3 py-1.5 ring-1 ${active ? "bg-neutral-900 text-white ring-neutral-900" : "text-neutral-700 ring-neutral-200"}`

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">Appointments</h1>
      <nav className="mt-6 flex gap-2 text-sm">
        <a href="/admin/appointments" className={tab(!past)}>
          Upcoming
        </a>
        <a href="/admin/appointments?view=past" className={tab(past)}>
          Past
        </a>
      </nav>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-6 space-y-3">
        {(data ?? []).map((a) => (
          <article key={a.id} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-neutral-900">
                  {fmt.format(new Date(a.starts_at))} <span className="font-normal text-neutral-500">Dubai</span>
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {a.name} · {a.purpose} · {a.mode} · {a.language} · <span className="font-mono text-xs">{a.reference}</span>
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  <a href={`mailto:${a.email}`} className="hover:underline">
                    {a.email}
                  </a>
                  {" · "}
                  <a href={`https://wa.me/${a.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {a.phone}
                  </a>
                  {a.meeting_url && (
                    <>
                      {" · "}
                      <a href={a.meeting_url} target="_blank" rel="noopener noreferrer" className="text-rose-700 hover:underline">
                        meeting link
                      </a>
                    </>
                  )}
                  {a.property_slug && ` · ${a.property_slug}`}
                </p>
                {a.notes && <p className="mt-2 text-sm text-neutral-700">“{a.notes}”</p>}
              </div>
              <AppointmentActions id={a.id} status={a.status} agent={a.agent_slug} agents={(agents ?? []).map((g) => ({ value: g.slug, label: g.name }))} />
            </div>
          </article>
        ))}
        {!data?.length && <p className="rounded-2xl bg-white p-10 text-center text-neutral-500 ring-1 ring-neutral-200">Nothing here yet.</p>}
      </div>
    </div>
  )
}
