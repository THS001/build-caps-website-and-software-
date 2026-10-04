import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { CommunityForm } from "@/components/admin/content-forms"

export default async function NewCommunity() {
  const supabase = await serverClient()
  void supabase
  return (
    <div>
      <Link href="/admin/communities" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Communities
      </Link>
      <h1 className="mt-2 mb-8 text-3xl font-semibold text-neutral-900">Add community</h1>
      <CommunityForm />
    </div>
  )
}
