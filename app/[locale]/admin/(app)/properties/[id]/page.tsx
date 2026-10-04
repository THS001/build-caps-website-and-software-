import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { PropertyForm, type PropertyRow } from "@/components/admin/property-form"
import { listingOptions } from "@/components/admin/options"
import { VerificationPanel } from "@/components/admin/verification-panel"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await serverClient()
  const [{ data }, options] = await Promise.all([supabase.from("properties").select("*").eq("id", id).maybeSingle(), listingOptions()])
  if (!data) notFound()

  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">Edit listing</h1>
      <VerificationPanel id={data.id} verification={data.verification} verifiedAt={data.verified_at} />
      <PropertyForm property={data as PropertyRow} {...options} />
    </div>
  )
}
