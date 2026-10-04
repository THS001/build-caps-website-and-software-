import { serverClient } from "@/lib/supabase/server"
import { site } from "@/lib/site"
import { BookingRulesForm, DeleteTimeOff, FeedLink, HoursEditor, TimeOffForm } from "@/components/admin/availability-tools"
import { dubaiFormat } from "@/lib/crm"

export default async function AdminAvailability() {
  const supabase = await serverClient()
  const [{ data: settings }, { data: agents }, { data: hours }, { data: off }, { data: feeds }] = await Promise.all([
    supabase.from("booking_settings").select("slot_minutes, buffer_minutes, min_notice_hours, days_ahead").limit(1).maybeSingle(),
    supabase.from("agents").select("slug, name").eq("active", true).neq("role", "ceo").order("sort_order"),
    supabase.from("agent_hours").select("agent_slug, weekday, starts, ends"),
    supabase.from("agent_time_off").select("id, agent_slug, starts_at, ends_at, reason").gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("calendar_feeds").select("token, agent_slug"),
  ])
  const names = Object.fromEntries((agents ?? []).map((a) => [a.slug, a.name]))
  const feedUrl = (agent: string | null) => {
    const f = (feeds ?? []).find((x) => x.agent_slug === agent)
    return f ? new URL(`/api/calendar/${f.token}.ics`, site.url).toString() : null
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">Availability</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">
        These rules drive the booking calendar on the website. Visitors only see times when the advisor works, has no booking (with the buffer either side) and isn&apos;t off. All times are Dubai time.
      </p>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-neutral-900">Booking rules</h2>
      {settings ? <BookingRulesForm settings={settings} /> : <p className="text-sm text-red-600">Booking settings are missing. Run the latest database migration.</p>}

      <h2 className="mt-10 mb-3 text-lg font-semibold text-neutral-900">Working hours</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(agents ?? []).map((a) => (
          <HoursEditor
            key={a.slug}
            agent={a.slug}
            name={a.name}
            hours={(hours ?? []).filter((h) => h.agent_slug === a.slug).map((h) => ({ weekday: h.weekday, starts: String(h.starts).slice(0, 5), ends: String(h.ends).slice(0, 5) }))}
          />
        ))}
        {!agents?.length && <p className="text-sm text-neutral-500">Add advisors (agents) first.</p>}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-neutral-900">Time off and holidays</h2>
      <TimeOffForm agents={agents ?? []} />
      <ul className="mt-4 divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-neutral-200">
        {(off ?? []).map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-44 font-medium text-neutral-900">{o.agent_slug ? (names[o.agent_slug] ?? o.agent_slug) : "Whole office"}</span>
            <span className="flex-1 text-neutral-700">
              {dubaiFormat(o.starts_at, { dateStyle: "medium", timeStyle: "short" })} → {dubaiFormat(o.ends_at, { dateStyle: "medium", timeStyle: "short" })}
              {o.reason && <span className="text-neutral-500"> · {o.reason}</span>}
            </span>
            <DeleteTimeOff id={o.id} />
          </li>
        ))}
        {!off?.length && <li className="px-4 py-4 text-sm text-neutral-400">No upcoming time off.</li>}
      </ul>

      <h2 className="mt-10 mb-1 text-lg font-semibold text-neutral-900">Calendar subscription links</h2>
      <p className="mb-3 max-w-3xl text-sm text-neutral-500">
        Paste a link into Google Calendar (Other calendars → From URL), Apple Calendar (File → New Calendar Subscription) or Outlook (Add calendar → Subscribe from web) to see bookings on your phone. Treat each link like a password: anyone with it can see the bookings. &ldquo;New link&rdquo; turns the old one off.
      </p>
      <ul className="divide-y divide-neutral-100 rounded-2xl bg-white px-4 ring-1 ring-neutral-200">
        <FeedLink label="Whole office" url={feedUrl(null)} agent={null} />
        {(agents ?? []).map((a) => (
          <FeedLink key={a.slug} label={a.name} url={feedUrl(a.slug)} agent={a.slug} />
        ))}
      </ul>
    </div>
  )
}
