-- Buildcaps: appointments (M7).
-- Bookings are written by the server (service role) through book_appointment(),
-- which serialises per advisor so two visitors can never take the same slot.
-- Visitors never read this table; they manage their booking with a private token.

-- Where booking notifications and pre-meeting briefs go for each advisor.
alter table public.agents add column email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create type public.appointment_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');

-- Weekly working hours per advisor, in Dubai time (no rows = Mon–Sat 09:00–19:00).
create table public.agent_hours (
  agent_slug text not null references public.agents (slug) on update cascade on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  starts time not null,
  ends time not null check (ends > starts),
  primary key (agent_slug, weekday, starts)
);

create table public.agent_time_off (
  id uuid primary key default gen_random_uuid(),
  agent_slug text references public.agents (slug) on update cascade on delete cascade, -- null = whole office (public holidays)
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  manage_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  purpose text not null check (purpose in ('strategy', 'viewing', 'valuation', 'mortgage', 'goldenVisa')),
  mode text not null check (mode in ('video', 'office', 'onsite', 'whatsapp')),
  agent_slug text not null references public.agents (slug) on update cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null default 'Asia/Dubai',
  name text not null check (length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (length(phone) between 6 and 40),
  language text not null default 'en',
  notes text check (length(notes) <= 2000),
  property_slug text,
  project_slug text,
  budget text,
  timeline text,
  status public.appointment_status not null default 'confirmed',
  calendar_event_id text,
  calendar_id text,
  meeting_url text,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  brief_sent_at timestamptz,
  followup_sent_at timestamptz,
  source text,
  utm jsonb not null default '{}'::jsonb
);

create index appointments_agent_time_idx on public.appointments (agent_slug, starts_at) where status = 'confirmed';
create index appointments_starts_idx on public.appointments (starts_at);

create trigger touch_appointments before update on public.appointments for each row execute function public.touch_updated_at();

alter table public.agent_hours enable row level security;
alter table public.agent_time_off enable row level security;
alter table public.appointments enable row level security;

create policy "staff read hours" on public.agent_hours for select using (public.is_staff());
create policy "editors manage hours" on public.agent_hours for all using (public.can_edit()) with check (public.can_edit());
create policy "staff read time off" on public.agent_time_off for select using (public.is_staff());
create policy "editors manage time off" on public.agent_time_off for all using (public.can_edit()) with check (public.can_edit());
create policy "staff read appointments" on public.appointments for select using (public.is_staff());
create policy "staff update appointments" on public.appointments for update using (public.is_staff()) with check (public.is_staff());

-- Busy intervals for an advisor (confirmed bookings widened by the buffer, and time off). No personal data.
create function public.agent_busy(p_agent text, p_from timestamptz, p_to timestamptz, p_buffer interval default '15 minutes')
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at - p_buffer, a.ends_at + p_buffer
  from public.appointments a
  where a.agent_slug = p_agent and a.status = 'confirmed' and a.starts_at - p_buffer < p_to and a.ends_at + p_buffer > p_from
  union all
  select t.starts_at, t.ends_at
  from public.agent_time_off t
  where (t.agent_slug = p_agent or t.agent_slug is null) and t.starts_at < p_to and t.ends_at > p_from
$$;

-- Atomic booking: one booking at a time per advisor (transaction-scoped advisory lock),
-- then an overlap check against confirmed bookings (with buffer) and time off.
create function public.book_appointment(p jsonb)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := (p ->> 'starts_at')::timestamptz;
  v_end timestamptz := (p ->> 'ends_at')::timestamptz;
  v_agent text := p ->> 'agent_slug';
  v_row public.appointments;
begin
  if v_start < now() + interval '1 hour' then
    raise exception 'slot_in_past' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('appointments:' || v_agent));
  if exists (select 1 from public.agent_busy(v_agent, v_start, v_end) b where b.starts_at < v_end and b.ends_at > v_start) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
  insert into public.appointments (purpose, mode, agent_slug, starts_at, ends_at, timezone, name, email, phone, language, notes, property_slug, project_slug, budget, timeline, source, utm)
  values (
    p ->> 'purpose', p ->> 'mode', v_agent, v_start, v_end, coalesce(p ->> 'timezone', 'Asia/Dubai'),
    p ->> 'name', p ->> 'email', p ->> 'phone', coalesce(p ->> 'language', 'en'), p ->> 'notes',
    p ->> 'property_slug', p ->> 'project_slug', p ->> 'budget', p ->> 'timeline', p ->> 'source',
    coalesce(p -> 'utm', '{}'::jsonb)
  )
  returning * into v_row;
  return v_row;
end $$;

-- Moving a booking re-runs the same checks, ignoring the booking itself.
create function public.reschedule_appointment(p_token uuid, p_start timestamptz, p_end timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.appointments;
begin
  select * into v_row from public.appointments where manage_token = p_token and status = 'confirmed';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_start < now() + interval '1 hour' then raise exception 'slot_in_past' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('appointments:' || v_row.agent_slug));
  if exists (
    select 1 from public.appointments a
    where a.agent_slug = v_row.agent_slug and a.status = 'confirmed' and a.id <> v_row.id
      and a.starts_at - interval '15 minutes' < p_end and a.ends_at + interval '15 minutes' > p_start
  ) or exists (
    select 1 from public.agent_time_off t
    where (t.agent_slug = v_row.agent_slug or t.agent_slug is null) and t.starts_at < p_end and t.ends_at > p_start
  ) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
  update public.appointments
  set starts_at = p_start, ends_at = p_end, reminder_24h_sent_at = null, reminder_1h_sent_at = null, brief_sent_at = null
  where id = v_row.id
  returning * into v_row;
  return v_row;
end $$;

-- Only the server (service role) may book or move appointments, or read busy times.
revoke execute on function public.book_appointment(jsonb) from public, anon, authenticated;
revoke execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.agent_busy(text, timestamptz, timestamptz, interval) from public, anon, authenticated;
