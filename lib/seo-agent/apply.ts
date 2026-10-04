import "server-only"
import { revalidateTag } from "next/cache"
import { adminClient } from "@/lib/supabase/admin"
import { CONTENT_TAG } from "@/lib/supabase/config"

// Applying and rolling back SEO proposals. Every change snapshots the page's
// previous override first, so any change can be undone exactly.

export type Proposal = {
  id: string
  locale: string
  pathname: string
  kind: "meta" | "schema" | "internal_links" | "faq" | "content" | "new_page"
  risk: "low" | "content"
  current: Record<string, unknown> | null
  proposed: Record<string, unknown>
  status: string
}

const OVERRIDE_FIELDS = ["title", "description", "faq", "links"] as const

/** Writes the proposal to seo_overrides (or creates a draft post for new_page). */
export async function applyProposal(p: Proposal, userId: string | null = null) {
  const supabase = adminClient()
  if (p.kind === "new_page") {
    const d = p.proposed as { slug?: string; title?: string; excerpt?: string; body?: string[]; category?: string }
    if (!d.slug || !d.title || !d.body?.length) throw new Error("Incomplete article draft")
    const { error } = await supabase.from("posts").insert({
      slug: d.slug,
      title: { en: d.title },
      excerpt: { en: d.excerpt ?? "" },
      body: d.body.map((para) => ({ en: para })),
      category: d.category ?? "guides",
      author: "Buildcaps Research",
      minutes: Math.max(2, Math.round(d.body.join(" ").split(/\s+/).length / 220)),
      published: false,
    })
    if (error) throw new Error(error.message)
  } else {
    const { data: before } = await supabase.from("seo_overrides").select("*").eq("locale", p.locale).eq("pathname", p.pathname).maybeSingle()
    await supabase.from("seo_snapshots").insert({ proposal_id: p.id, locale: p.locale, pathname: p.pathname, before })
    const patch: Record<string, unknown> = {}
    for (const field of OVERRIDE_FIELDS) if (field in p.proposed) patch[field] = p.proposed[field]
    const { error } = await supabase
      .from("seo_overrides")
      .upsert({ locale: p.locale, pathname: p.pathname, ...(before ?? {}), ...patch, proposal_id: p.id, updated_at: new Date().toISOString() }, { onConflict: "locale,pathname" })
    if (error) throw new Error(error.message)
  }
  await supabase.from("seo_proposals").update({ status: "applied", applied_at: new Date().toISOString(), decided_by: userId }).eq("id", p.id)
  revalidateTag(CONTENT_TAG)
}

/** Restores the page exactly as it was before this proposal. */
export async function rollbackProposal(id: string, result?: Record<string, unknown>) {
  const supabase = adminClient()
  const { data: p } = await supabase.from("seo_proposals").select("*").eq("id", id).single()
  if (!p) throw new Error("Proposal not found")
  if (p.kind !== "new_page") {
    const { data: snap } = await supabase.from("seo_snapshots").select("before").eq("proposal_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    if (snap?.before) await supabase.from("seo_overrides").upsert(snap.before as Record<string, unknown>, { onConflict: "locale,pathname" })
    else await supabase.from("seo_overrides").delete().eq("locale", p.locale).eq("pathname", p.pathname)
  }
  await supabase.from("seo_proposals").update({ status: "rolled_back", ...(result ? { result } : {}) }).eq("id", id)
  revalidateTag(CONTENT_TAG)
}
