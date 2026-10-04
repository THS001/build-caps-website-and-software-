-- Bookings run on the site's own calendar: Google Calendar is no longer used.
-- Video calls use the advisor's own meeting room link, or a free Jitsi room.

alter table public.agents
  add column if not exists meeting_url text check (meeting_url is null or meeting_url ~* '^https://[^\s]+$');

alter table public.agents drop column if exists calendar_id;
alter table public.appointments
  drop column if exists calendar_event_id,
  drop column if exists calendar_id;

-- Visitors see an advisor's public profile only: never their email, meeting
-- link or login. (Staff sign in as `authenticated` and keep every column.)
revoke select on public.agents from anon;
grant select (slug, name, role, languages, specialties, bio, brn, photo_url, responds_within, active, sort_order, score, updated_at)
  on public.agents to anon;

insert into public._buildcaps_migrations (name)
select 'supabase/migrations/20261004000009_own_calendar.sql'
where not exists (select 1 from public._buildcaps_migrations where name = 'supabase/migrations/20261004000009_own_calendar.sql');
