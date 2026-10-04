import Link from "next/link"
import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { ReportForm, DeleteContent, type ReportRow } from "@/components/admin/content-forms"

export default async function EditReport({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("reports").select("slug, kind, title, quarter, summary, file_path, published").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/reports" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Reports and guide
        </Link>
        <DeleteContent table="reports" slug={slug} back="/admin/reports" />
      </div>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">{(data.title as { en: string }).en}</h1>
      <ReportForm row={data as unknown as ReportRow} />
    </div>
  )
}
