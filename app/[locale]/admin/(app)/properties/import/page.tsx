import { BrochureImport } from "@/components/admin/brochure-import"

export default function ImportBrochurePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold text-neutral-900">Import a brochure</h1>
      <p className="mt-2 text-neutral-600">
        Upload a developer brochure (PDF). Claude drafts the listing in all 10 languages with the payment plan, highlights and amenities. It is saved as an unpublished draft;
        check every fact, add photos and the DLD permit, then publish.
      </p>
      <BrochureImport />
    </div>
  )
}
