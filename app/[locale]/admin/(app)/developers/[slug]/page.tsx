import Link from "next/link"
import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { DeveloperForm, DeleteContent, type DeveloperRow } from "@/components/admin/content-forms"

export default async function EditDeveloper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("developers").select("slug, name, founded, summary, logo_url, delivered_projects, on_time_rate, promises_kept, published").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/developers" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Developers
        </Link>
        <DeleteContent table="developers" slug={slug} back="/admin/developers" />
      </div>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">{data.name}</h1>
      <DeveloperForm row={data as unknown as DeveloperRow} />
    </div>
  )
}
