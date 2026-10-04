import Link from "next/link"
import { notFound } from "next/navigation"
import { Star } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"
import { AgentForm, type AgentRow } from "@/components/admin/agent-form"
import { RecomputeScore, ReviewActions } from "@/components/admin/review-controls"
import type { AdvisorScore } from "@/lib/data/types"

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-neutral-900">{value}</dd>
    </div>
  )
}

export default async function EditAgent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const [{ data: agent }, { data: staff }, { data: reviews }] = await Promise.all([
    supabase.from("agents").select("slug, name, role, languages, specialties, bio, brn, email, meeting_url, photo_url, responds_within, user_id, sort_order, active, score, score_at").eq("slug", slug).maybeSingle(),
    supabase.from("profiles").select("id, full_name, role").not("role", "is", null),
    supabase.from("advisor_reviews").select("id, rating, comment, first_name, locale, published, created_at").eq("agent_slug", slug).order("created_at", { ascending: false }).limit(100),
  ])
  if (!agent) notFound()
  const score = agent.score as AdvisorScore | null

  return (
    <div>
      <Link href="/admin/team" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Team
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-900">{agent.name}</h1>

      <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-neutral-900">
            Advisor Score {score?.score != null && <span className="ms-2 text-rose-700">{score.score}/100</span>}
          </h2>
          <RecomputeScore slug={agent.slug} />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {score?.ready ? "Shown on the public profile." : "Not shown publicly yet: it needs 5 completed meetings or 3 approved reviews."} Recalculated daily
          {agent.score_at ? `, last on ${new Date(agent.score_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })}` : ""}.
        </p>
        {score && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Rating" value={score.rating !== null ? `${score.rating} (${score.reviews})` : "No reviews"} />
            <Fact label="First reply (median)" value={score.responseMinutes !== null ? `${score.responseMinutes} min` : "Too few"} />
            <Fact label="Show rate" value={score.showRate !== null ? `${Math.round(score.showRate * 100)}%` : "Too few"} />
            <Fact label="Meetings (12 mo)" value={String(score.meetings)} />
            <Fact label="Deals won (12 mo)" value={String(score.deals)} />
            <Fact label="Strengths" value={score.strengths.length ? score.strengths.join(", ") : "None yet"} />
          </dl>
        )}
        {score?.summary?.en && <p className="mt-3 text-sm text-neutral-700">“{score.summary.en}”</p>}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        <h2 className="font-semibold text-neutral-900">Verified reviews</h2>
        <p className="mt-1 text-xs text-neutral-500">Clients can review only after a meeting took place, through the private link in their booking emails. Approve a review to show it on the profile.</p>
        <ul className="mt-4 divide-y divide-neutral-100">
          {(reviews ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex" aria-label={`${r.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={n <= r.rating ? "h-4 w-4 fill-rose-400 text-rose-400" : "h-4 w-4 text-neutral-300"} />
                    ))}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {r.first_name ?? "Client"} · {r.locale.toUpperCase()} · {new Date(r.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })} · {r.published ? "Shown" : "Waiting for approval"}
                  </span>
                </p>
                {r.comment && (
                  <p className="mt-1 whitespace-pre-line text-neutral-700" lang={r.locale}>
                    {r.comment}
                  </p>
                )}
              </div>
              <ReviewActions id={r.id} published={r.published} />
            </li>
          ))}
          {!reviews?.length && <li className="py-3 text-sm text-neutral-500">No reviews yet.</li>}
        </ul>
      </section>

      <div className="mt-8">
        <AgentForm agent={agent as AgentRow} staff={(staff ?? []).map((s) => ({ id: s.id, name: s.full_name ?? "Staff", role: s.role }))} />
      </div>
    </div>
  )
}
