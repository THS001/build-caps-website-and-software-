import { PropertyForm } from "@/components/admin/property-form"
import { listingOptions } from "@/components/admin/options"

export default async function NewPropertyPage() {
  const options = await listingOptions()
  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">New listing</h1>
      <PropertyForm {...options} />
    </div>
  )
}
