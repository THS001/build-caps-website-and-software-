import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { DeveloperForm } from "@/components/admin/content-forms"

export default async function NewDeveloper() {
  const supabase = await serverClient()
  void supabase
  return (
    <div>
      <Link href="/admin/developers" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Developers
      </Link>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">Add developer</h1>
      <DeveloperForm />
    </div>
  )
}
