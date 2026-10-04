import Link from "next/link"
import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { ProjectForm, DeleteContent, type ProjectRow } from "@/components/admin/content-forms"

export default async function EditProject({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("projects").select("slug, name, developer_slug, community_slug, summary, launch_price_aed, handover, launched_on, payment_plan, unit_types, construction_progress, escrow_registered, floors, lat, lng, published").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  const [{ data: developers }, { data: communities }] = await Promise.all([supabase.from("developers").select("slug, name").order("name"), supabase.from("communities").select("slug, name").order("name")])
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/projects" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Off-plan projects
        </Link>
        <DeleteContent table="projects" slug={slug} back="/admin/projects" />
      </div>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">{data.name}</h1>
      <ProjectForm row={data as unknown as ProjectRow} developers={developers ?? []} communities={communities ?? []} />
    </div>
  )
}
