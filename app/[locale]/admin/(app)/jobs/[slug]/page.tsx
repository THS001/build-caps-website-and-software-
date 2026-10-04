import Link from "next/link"
import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { JobForm, DeleteContent, type JobRow } from "@/components/admin/content-forms"

export default async function EditJob({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("jobs").select("slug, title, location, type, summary, requirements, published").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/jobs" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Careers
        </Link>
        <DeleteContent table="jobs" slug={slug} back="/admin/jobs" />
      </div>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">{(data.title as { en: string }).en}</h1>
      <JobForm row={data as unknown as JobRow} />
    </div>
  )
}
