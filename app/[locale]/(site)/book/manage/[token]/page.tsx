import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { ManageBooking, type ManageView } from "@/components/booking/manage-booking"
import { getBookingSchedule } from "@/lib/booking/settings"
import { ReviewForm } from "@/components/booking/review-form"

// Private page reached from booking emails. Never indexed or cached.
export const metadata: Metadata = { title: "Manage appointment", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

type Loaded = ManageView & { firstName: string; reviewable: boolean }

async function load(token: string): Promise<Loaded | null> {
  if (!adminConfigured || !/^[0-9a-f-]{36}$/i.test(token)) return null
  const supabase = adminClient()
  const { data } = await supabase
    .from("appointments")
    .select("id, reference, purpose, mode, starts_at, ends_at, timezone, meeting_url, status, agent_slug, name, agents(name)")
    .eq("manage_token", token)
    .maybeSingle()
  if (!data) return null
  const agent = data.agents as unknown as { name: string } | null
  // A meeting that took place can be reviewed once (verified review).
  const tookPlace = data.status === "completed" || (data.status === "confirmed" && new Date(data.ends_at).getTime() < Date.now())
  const { count } = tookPlace ? await supabase.from("advisor_reviews").select("id", { count: "exact", head: true }).eq("appointment_id", data.id) : { count: 1 }
  return {
    token,
    reference: data.reference,
    purpose: data.purpose,
    mode: data.mode,
    startsAt: data.starts_at,
    timezone: data.timezone,
    advisor: agent?.name ?? "Buildcaps",
    meetingUrl: data.meeting_url,
    status: data.status,
    firstName: String(data.name).split(" ")[0],
    reviewable: tookPlace && !count,
  }
}

export default async function ManagePage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations("booking.manage")
  const [booking, schedule] = await Promise.all([load(token), getBookingSchedule()])

  return (
    <main id="main" className="bg-aurora min-h-svh pt-28 pb-20 md:pt-36">
      <div className="container-custom max-w-3xl">
        <h1 className="mb-8 text-4xl font-semibold text-neutral-900">{t("title")}</h1>
        {booking ? <ManageBooking booking={booking} schedule={{ daysAhead: schedule.daysAhead, openWeekdays: schedule.openWeekdays }} /> : <p className="rounded-3xl bg-white p-8 text-neutral-700 ring-1 ring-neutral-200">{t("notFound")}</p>}
        {booking?.reviewable && (
          <div className="mt-8">
            <ReviewForm token={token} advisor={booking.advisor} firstName={booking.firstName} />
          </div>
        )}
      </div>
    </main>
  )
}
