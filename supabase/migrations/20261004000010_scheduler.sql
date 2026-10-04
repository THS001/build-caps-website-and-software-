-- A free scheduler inside the database. Vercel's free plan runs jobs only once a
-- day, but booking reminders (24 hours and 1 hour before) and advisor briefs
-- (30 minutes before) need a run every 15 minutes. pg_cron triggers it and pg_net
-- calls the site. The database makes its own random token, and the site accepts
-- calls that carry it (lib/cron.ts), so no secret is ever copied anywhere.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.scheduler_settings (
  id boolean primary key default true check (id),
  base_url text not null check (base_url ~ '^https://[^/\s]+$'),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now()
);
alter table public.scheduler_settings enable row level security;
-- No policies: only the server (service role) and the database itself can read it.
revoke all on public.scheduler_settings from anon, authenticated;

-- The live site. When buildcaps.com moves here, update base_url.
insert into public.scheduler_settings (id, base_url) values (true, 'https://buildcaps.vercel.app')
on conflict (id) do nothing;

-- Calls one of the site's job endpoints with the token. Returns the pg_net request id.
create or replace function public.call_scheduled_job(p_path text)
returns bigint
language sql
security definer
set search_path = public, extensions
as $$
  select net.http_get(
    url := s.base_url || p_path,
    headers := jsonb_build_object('x-scheduler-token', s.token),
    timeout_milliseconds := 60000
  )
  from public.scheduler_settings s
  where s.id
$$;
revoke execute on function public.call_scheduled_job(text) from public, anon, authenticated;

-- Every 15 minutes: reminders, advisor briefs, feedback requests, Advisor Scores.
select cron.unschedule(jobid) from cron.job where jobname = 'buildcaps-booking';
select cron.schedule('buildcaps-booking', '*/15 * * * *', $job$select public.call_scheduled_job('/api/cron/booking')$job$);

insert into public._buildcaps_migrations (name)
select 'supabase/migrations/20261004000010_scheduler.sql'
where not exists (select 1 from public._buildcaps_migrations where name = 'supabase/migrations/20261004000010_scheduler.sql');
