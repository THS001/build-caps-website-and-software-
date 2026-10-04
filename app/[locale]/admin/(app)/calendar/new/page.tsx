import Link from "next/link"
import { serverClient } from "@/lib/supabase/server"
import { getBookingSchedule } from "@/lib/booking/settings"
import { StaffBookingForm } from "@/components/admin/staff-booking-form"

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ contact?: string; agent?: string; date?: string }> }) {
  const sp = await searchParams
  const supabase = await serverClient()
  const [{ data: agents }, schedule, contact] = await Promise.all([
    supabase.from("agents").select("slug, name").eq("active", true).neq("role", "ceo").order("sort_order"),
    getBookingSchedule(),
    sp.contact && /^[0-9a-f-]{36}$/.test(sp.contact) ? supabase.from("contacts").select("id, name, email, phone, locale, owner").eq("id", sp.contact).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const c = contact.data
  return (
    <div>
      <Link href="/admin/calendar" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Calendar
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-900">New booking</h1>
      <p className="mt-2 text-sm text-neutral-500">For bookings taken by phone, WhatsApp or at the office. The client is added to the CRM automatically.</p>
      <div className="mt-8">
        <StaffBookingForm
          agents={agents ?? []}
          slotMinutes={schedule.slotMinutes}
          prefill={{ contactId: c?.id, name: c?.name ?? undefined, email: c?.email, phone: c?.phone ?? undefined, language: c?.locale ?? undefined, agent: sp.agent ?? c?.owner ?? undefined, date: sp.date }}
        />
      </div>
    </div>
  )
}
