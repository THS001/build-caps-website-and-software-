import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { JobForm } from "@/components/admin/content-forms"

export default async function NewJob() {
  const supabase = await serverClient()
  void supabase
  return (
    <div>
      <Link href="/admin/jobs" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Careers
      </Link>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">Add role</h1>
      <JobForm />
    </div>
  )
}
