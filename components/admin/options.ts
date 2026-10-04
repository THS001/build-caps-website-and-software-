import "server-only"
import { serverClient } from "@/lib/supabase/server"

/** Dropdown options for the listing form, read as the signed-in staff member (drafts included). */
export async function listingOptions() {
  const supabase = await serverClient()
  const [communities, developers, projects, agents] = await Promise.all([
    supabase.from("communities").select("slug, name").order("name"),
    supabase.from("developers").select("slug, name").order("name"),
    supabase.from("projects").select("slug, name").order("name"),
    supabase.from("agents").select("slug, name").eq("active", true).order("sort_order"),
  ])
  const opt = (rows: { slug: string; name: string }[] | null) => (rows ?? []).map((r) => ({ value: r.slug, label: r.name }))
  return { communities: opt(communities.data), developers: opt(developers.data), projects: opt(projects.data), agents: opt(agents.data) }
}
