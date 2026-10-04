import { serverClient } from "@/lib/supabase/server"
import { ProgressForm, ProjectFacts, PromiseForm, PromiseList, type ProjectRow, type PromiseRow } from "@/components/admin/track-record"

/** Verified records behind the Promise Ledger and the Handover Truth Score. */
export default async function AdminTrackRecord() {
  const supabase = await serverClient()
  const [{ data: developers }, { data: projects }, { data: promises, error }] = await Promise.all([
    supabase.from("developers").select("slug, name").order("name"),
    supabase.from("projects").select("slug, name, floors, launched_on, escrow_registered, construction_progress, handover").order("name"),
    supabase.from("developer_promises").select("*").order("created_at", { ascending: false }).limit(300),
  ])
  const developerNames = Object.fromEntries((developers ?? []).map((d) => [d.slug, d.name]))

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">Track record</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        Developer promises (Promise Ledger) and construction progress readings (Handover Truth Score). Only verified records should go live: each one changes what buyers see.
      </p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}

      <section className="mt-8 space-y-4">
        <PromiseForm developers={developers ?? []} projects={(projects ?? []).map((p) => ({ slug: p.slug, name: p.name }))} />
        <PromiseList rows={(promises ?? []) as PromiseRow[]} developerNames={developerNames} />
      </section>

      <section className="mt-12 space-y-4">
        <ProgressForm projects={(projects ?? []).map((p) => ({ slug: p.slug, name: p.name }))} />
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="px-4 pt-4 text-start font-semibold text-neutral-900">Project facts</caption>
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Project</th>
                <th className="px-4 py-3 text-start font-medium">Progress</th>
                <th className="px-4 py-3 text-start font-medium">Floors</th>
                <th className="px-4 py-3 text-start font-medium">Launched</th>
                <th className="px-4 py-3 text-start font-medium">Escrow</th>
                <th className="px-4 py-3 text-start font-medium">Handover</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {((projects ?? []) as ProjectRow[]).map((p) => (
                <ProjectFacts key={p.slug} project={{ ...p, construction_progress: Number(p.construction_progress) }} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
