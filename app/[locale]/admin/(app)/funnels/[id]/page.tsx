import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { FunnelForm, type FunnelRow } from "@/components/admin/funnel-form"

export default async function EditFunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("funnels").select("*").eq("id", id).maybeSingle()
  if (!data) notFound()

  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">Edit opportunity</h1>
      <FunnelForm funnel={data as FunnelRow} />
    </div>
  )
}
