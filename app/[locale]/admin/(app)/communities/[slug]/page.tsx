import Link from "next/link"
import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { CommunityForm, DeleteContent, type CommunityRow } from "@/components/admin/content-forms"

export default async function EditCommunity({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("communities").select("slug, name, summary, lifestyle, schools, transport, avg_price_per_sqft, est_yield, price_change_12m, lat, lng, waterfront, dld_areas, published").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/communities" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Communities
        </Link>
        <DeleteContent table="communities" slug={slug} back="/admin/communities" />
      </div>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">{data.name}</h1>
      <CommunityForm row={data as unknown as CommunityRow} />
    </div>
  )
}
