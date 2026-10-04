import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { ContactForm } from "@/components/admin/contact-form"

export default async function NewContact() {
  const supabase = await serverClient()
  const { data: agents } = await supabase.from("agents").select("slug, name").eq("active", true).order("sort_order")
  return (
    <div>
      <Link href="/admin/crm" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← CRM
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Add a contact</h1>
      <p className="mt-2 text-sm text-neutral-500">Website enquiries and bookings are added automatically. Use this for phone calls, walk-ins and referrals.</p>
      <div className="mt-8">
        <ContactForm agents={agents ?? []} />
      </div>
    </div>
  )
}
