import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { ReportForm } from "@/components/admin/content-forms"

export default async function NewReport() {
  const supabase = await serverClient()
  void supabase
  return (
    <div>
      <Link href="/admin/reports" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Reports and guide
      </Link>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">Add report or guide</h1>
      <ReportForm />
    </div>
  )
}
