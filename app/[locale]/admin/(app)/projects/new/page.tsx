import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { ProjectForm } from "@/components/admin/content-forms"

export default async function NewProject() {
  const supabase = await serverClient()
  const [{ data: developers }, { data: communities }] = await Promise.all([supabase.from("developers").select("slug, name").order("name"), supabase.from("communities").select("slug, name").order("name")])
  return (
    <div>
      <Link href="/admin/projects" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Off-plan projects
      </Link>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">Add project</h1>
      <ProjectForm developers={developers ?? []} communities={communities ?? []} />
    </div>
  )
}
