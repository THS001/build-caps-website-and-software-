-- Our own booking system, managed from the admin, and the CRM.
--
-- Booking: settings (slot length, buffer, notice, how far ahead), staff
-- bookings and rescheduling with the same overlap guarantees, and private
-- calendar feeds advisors can subscribe to from any calendar app.
--
-- CRM: one contact per person (by email). Every enquiry and booking files
-- itself under its contact automatically, with an activity timeline, a pipeline
-- stage, an owner, tasks and follow-up dates.

-- ── Booking settings ──────────────────────────────────────────────────────
create table public.booking_settings (
  id boolean primary key default true check (id),
  slot_minutes smallint not null default 45 check (slot_minutes between 15 and 240),
  buffer_minutes smallint not null default 15 check (buffer_minutes between 0 and 120),
  min_notice_hours smallint not null default 2 check (min_notice_hours between 0 and 168),
  days_ahead smallint not null default 14 check (days_ahead between 1 and 90),
  updated_at timestamptz not null default now()
);
insert into public.booking_settings default values;

create trigger touch_booking_settings before update on public.booking_settings for each row execute function public.touch_updated_at();

alter table public.booking_settings enable row level security;
create policy "staff read booking settings" on public.booking_settings for select using (public.is_staff());
create policy "editors update booking settings" on public.booking_settings for update using (public.can_edit()) with check (public.can_edit());

create function public.booking_buffer() returns interval
language sql stable security definer set search_path = public as $$
  select make_interval(mins => coalesce((select buffer_minutes from public.booking_settings limit 1), 15))
$$;

create function public.booking_notice() returns interval
language sql stable security definer set search_path = public as $$
  select make_interval(hours => coalesce((select min_notice_hours from public.booking_settings limit 1), 2))
$$;

-- Busy times now use the configured buffer unless one is passed.
drop function public.agent_busy(text, timestamptz, timestamptz, interval);
create function public.agent_busy(p_agent text, p_from timestamptz, p_to timestamptz, p_buffer interval default null)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at - coalesce(p_buffer, public.booking_buffer()), a.ends_at + coalesce(p_buffer, public.booking_buffer())
  from public.appointments a
  where a.agent_slug = p_agent and a.status = 'confirmed'
    and a.starts_at - coalesce(p_buffer, public.booking_buffer()) < p_to and a.ends_at + coalesce(p_buffer, public.booking_buffer()) > p_from
  union all
  select t.starts_at, t.ends_at
  from public.agent_time_off t
  where (t.agent_slug = p_agent or t.agent_slug is null) and t.starts_at < p_to and t.ends_at > p_from
$$;

alter table public.appointments add column created_by uuid references auth.users (id) on delete set null;

-- Atomic booking. Visitors need the configured notice; staff bookings ("staff": true)
-- may be short-notice, and may knowingly overlap ("force": true).
create or replace function public.book_appointment(p jsonb)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := (p ->> 'starts_at')::timestamptz;
  v_end timestamptz := (p ->> 'ends_at')::timestamptz;
  v_agent text := p ->> 'agent_slug';
  v_staff boolean := coalesce((p ->> 'staff')::boolean, false);
  v_force boolean := v_staff and coalesce((p ->> 'force')::boolean, false);
  v_row public.appointments;
begin
  if v_end <= v_start then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;
  if (not v_staff and v_start < now() + public.booking_notice()) or (v_staff and v_start < now() - interval '5 minutes') then
    raise exception 'slot_in_past' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('appointments:' || v_agent));
  if not v_force and exists (select 1 from public.agent_busy(v_agent, v_start, v_end) b where b.starts_at < v_end and b.ends_at > v_start) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
  insert into public.appointments (purpose, mode, agent_slug, starts_at, ends_at, timezone, name, email, phone, language, notes, property_slug, project_slug, budget, timeline, source, utm, created_by)
  values (
    p ->> 'purpose', p ->> 'mode', v_agent, v_start, v_end, coalesce(p ->> 'timezone', 'Asia/Dubai'),
    p ->> 'name', p ->> 'email', p ->> 'phone', coalesce(p ->> 'language', 'en'), p ->> 'notes',
    p ->> 'property_slug', p ->> 'project_slug', p ->> 'budget', p ->> 'timeline', p ->> 'source',
    coalesce(p -> 'utm', '{}'::jsonb), nullif(p ->> 'created_by', '')::uuid
  )
  returning * into v_row;
  return v_row;
end $$;

-- Visitor self-service move (by private token), with the configured buffer and notice.
create or replace function public.reschedule_appointment(p_token uuid, p_start timestamptz, p_end timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.appointments;
begin
  select * into v_row from public.appointments where manage_token = p_token and status = 'confirmed';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_start < now() + public.booking_notice() then raise exception 'slot_in_past' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('appointments:' || v_row.agent_slug));
  if exists (
    select 1 from public.agent_busy(v_row.agent_slug, p_start, p_end) b
    where b.starts_at < p_end and b.ends_at > p_start
      and not (b.starts_at = v_row.starts_at - public.booking_buffer() and b.ends_at = v_row.ends_at + public.booking_buffer())
  ) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
  update public.appointments
  set starts_at = p_start, ends_at = p_end, reminder_24h_sent_at = null, reminder_1h_sent_at = null, brief_sent_at = null
  where id = v_row.id
  returning * into v_row;
  return v_row;
end $$;

-- Staff move or reassign a booking from the admin calendar (same locking and checks).
create function public.staff_reschedule_appointment(p_id uuid, p_start timestamptz, p_end timestamptz, p_agent text default null, p_force boolean default false)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row public.appointments;
  v_agent text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_row from public.appointments where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_end <= p_start then raise exception 'invalid_time' using errcode = 'P0001'; end if;
  v_agent := coalesce(p_agent, v_row.agent_slug);
  perform pg_advisory_xact_lock(hashtext('appointments:' || v_agent));
  if not p_force and (
    exists (
      select 1 from public.appointments a
      where a.agent_slug = v_agent and a.status = 'confirmed' and a.id <> v_row.id
        and a.starts_at - public.booking_buffer() < p_end and a.ends_at + public.booking_buffer() > p_start
    ) or exists (
      select 1 from public.agent_time_off t
      where (t.agent_slug = v_agent or t.agent_slug is null) and t.starts_at < p_end and t.ends_at > p_start
    )
  ) then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;
  update public.appointments
  set starts_at = p_start, ends_at = p_end, agent_slug = v_agent, status = 'confirmed',
      reminder_24h_sent_at = null, reminder_1h_sent_at = null, brief_sent_at = null
  where id = v_row.id
  returning * into v_row;
  return v_row;
end $$;

revoke execute on function public.book_appointment(jsonb) from public, anon, authenticated;
revoke execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.agent_busy(text, timestamptz, timestamptz, interval) from public, anon, authenticated;
revoke execute on function public.booking_buffer() from public, anon;
revoke execute on function public.booking_notice() from public, anon;
revoke execute on function public.staff_reschedule_appointment(uuid, timestamptz, timestamptz, text, boolean) from public, anon;
grant execute on function public.staff_reschedule_appointment(uuid, timestamptz, timestamptz, text, boolean) to authenticated;

-- ── Calendar feeds (iCal subscription links) ─────────────────────────────
-- agent_slug null = the whole office. The token is the secret in the URL.
create table public.calendar_feeds (
  token uuid primary key default gen_random_uuid(),
  agent_slug text references public.agents (slug) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);
create unique index calendar_feeds_one_per_agent on public.calendar_feeds (coalesce(agent_slug, '*'));

alter table public.calendar_feeds enable row level security;
create policy "staff read feeds" on public.calendar_feeds for select using (public.is_staff());
create policy "editors manage feeds" on public.calendar_feeds for all using (public.can_edit()) with check (public.can_edit());

-- ── CRM ───────────────────────────────────────────────────────────────────
create type public.crm_stage as enum ('new', 'contacted', 'qualified', 'meeting', 'negotiation', 'won', 'lost');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null unique check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (length(name) <= 120),
  phone text check (length(phone) <= 40),
  country text check (length(country) <= 80),
  locale text check (length(locale) <= 8),
  -- subscriber: newsletter only; lead: asked or booked; client: won at least once.
  lifecycle text not null default 'lead' check (lifecycle in ('subscriber', 'lead', 'client')),
  stage public.crm_stage not null default 'new',
  owner text references public.agents (slug) on update cascade on delete set null,
  score smallint check (score between 0 and 100),
  budget_aed bigint check (budget_aed >= 0),
  value_aed bigint check (value_aed >= 0),
  interests text[] not null default '{}',
  tags text[] not null default '{}',
  source text check (length(source) <= 200),
  utm jsonb not null default '{}'::jsonb,
  lost_reason text check (length(lost_reason) <= 300),
  last_activity_at timestamptz not null default now(),
  next_follow_up_at timestamptz
);

create index contacts_stage_idx on public.contacts (stage, last_activity_at desc);
create index contacts_owner_idx on public.contacts (owner);
create index contacts_follow_up_idx on public.contacts (next_follow_up_at) where next_follow_up_at is not null;

create table public.contact_activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('lead', 'booking', 'meeting', 'note', 'call', 'email', 'whatsapp', 'stage', 'task', 'system')),
  body text check (length(body) <= 5000),
  meta jsonb not null default '{}'::jsonb,
  author uuid references auth.users (id) on delete set null
);
create index contact_activities_contact_idx on public.contact_activities (contact_id, created_at desc);

create table public.contact_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null check (length(title) between 1 and 300),
  due_at timestamptz not null,
  done_at timestamptz,
  assignee text references public.agents (slug) on update cascade on delete set null,
  created_by uuid references auth.users (id) on delete set null
);
create index contact_tasks_open_idx on public.contact_tasks (due_at) where done_at is null;

alter table public.leads add column contact_id uuid references public.contacts (id) on delete set null;
alter table public.appointments add column contact_id uuid references public.contacts (id) on delete set null;
create index leads_contact_idx on public.leads (contact_id);
create index appointments_contact_idx on public.appointments (contact_id);

-- The contact for an email, created or enriched (never overwriting what staff entered).
create function public.contact_for(p_email text, p_name text, p_phone text, p_country text, p_locale text, p_source text, p_utm jsonb, p_lifecycle text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.contacts (email, name, phone, country, locale, source, utm, lifecycle)
  values (lower(trim(p_email)), p_name, p_phone, p_country, p_locale, p_source, coalesce(p_utm, '{}'::jsonb), p_lifecycle)
  on conflict (email) do update set
    name = coalesce(contacts.name, excluded.name),
    phone = coalesce(contacts.phone, excluded.phone),
    country = coalesce(contacts.country, excluded.country),
    locale = coalesce(contacts.locale, excluded.locale),
    lifecycle = case when contacts.lifecycle = 'subscriber' and excluded.lifecycle <> 'subscriber' then excluded.lifecycle else contacts.lifecycle end,
    last_activity_at = now()
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.contact_for(text, text, text, text, text, text, jsonb, text) from public, anon, authenticated;

-- Backfill anything recorded before the CRM existed.
update public.leads set contact_id = public.contact_for(email, name, phone, country, locale, source, utm, case when kind = 'newsletter' then 'subscriber' else 'lead' end) where contact_id is null;
update public.appointments set contact_id = public.contact_for(email, name, phone, null, language, source, utm, 'lead') where contact_id is null;
insert into public.contact_activities (contact_id, kind, body, meta, created_at)
  select contact_id, 'lead', message, jsonb_build_object('lead_id', id, 'kind', kind, 'interest', interest, 'source', source), created_at from public.leads where contact_id is not null;
insert into public.contact_activities (contact_id, kind, body, meta, created_at)
  select contact_id, 'booking', null, jsonb_build_object('appointment_id', id, 'reference', reference, 'starts_at', starts_at, 'purpose', purpose, 'mode', mode, 'agent', agent_slug), created_at from public.appointments where contact_id is not null;

-- Every new enquiry files itself under its contact.
create function public.leads_to_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.contact_id := public.contact_for(new.email, new.name, new.phone, new.country, new.locale, new.source, new.utm, case when new.kind = 'newsletter' then 'subscriber' else 'lead' end);
  insert into public.contact_activities (contact_id, kind, body, meta)
  values (new.contact_id, 'lead', new.message, jsonb_build_object('lead_id', new.id, 'kind', new.kind, 'interest', new.interest, 'source', new.source));
  if new.assigned_agent is not null then
    update public.contacts set owner = coalesce(owner, new.assigned_agent) where id = new.contact_id;
  end if;
  return new;
end $$;
create trigger leads_contact before insert on public.leads for each row execute function public.leads_to_contact();

-- Every booking files itself too, moves the deal to "meeting" and gives it an owner.
create function public.appointments_to_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.contact_id := public.contact_for(new.email, new.name, new.phone, null, new.language, new.source, new.utm, 'lead');
  insert into public.contact_activities (contact_id, kind, meta, author)
  values (new.contact_id, 'booking', jsonb_build_object('appointment_id', new.id, 'reference', new.reference, 'starts_at', new.starts_at, 'purpose', new.purpose, 'mode', new.mode, 'agent', new.agent_slug), new.created_by);
  update public.contacts
  set stage = case when stage in ('new', 'contacted', 'qualified') then 'meeting'::public.crm_stage else stage end,
      owner = coalesce(owner, new.agent_slug)
  where id = new.contact_id;
  return new;
end $$;
create trigger appointments_contact before insert on public.appointments for each row execute function public.appointments_to_contact();

-- Meeting outcomes and moves show on the timeline.
create function public.appointments_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.contact_id is null then return new; end if;
  if new.status is distinct from old.status then
    insert into public.contact_activities (contact_id, kind, body, meta, author)
    values (new.contact_id, 'meeting', new.status::text, jsonb_build_object('appointment_id', new.id, 'reference', new.reference, 'status', new.status), auth.uid());
  elsif new.starts_at is distinct from old.starts_at or new.agent_slug is distinct from old.agent_slug then
    insert into public.contact_activities (contact_id, kind, body, meta, author)
    values (new.contact_id, 'meeting', 'rescheduled', jsonb_build_object('appointment_id', new.id, 'reference', new.reference, 'from', old.starts_at, 'to', new.starts_at, 'agent', new.agent_slug), auth.uid());
  else
    return new;
  end if;
  update public.contacts set last_activity_at = now() where id = new.contact_id;
  return new;
end $$;
create trigger appointments_activity after update on public.appointments for each row execute function public.appointments_activity();

-- Stage changes are logged; winning a deal makes the contact a client.
create function public.contacts_on_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.stage is distinct from old.stage then
    insert into public.contact_activities (contact_id, kind, body, meta, author)
    values (new.id, 'stage', new.stage::text, jsonb_build_object('from', old.stage, 'to', new.stage), auth.uid());
    new.last_activity_at := now();
    if new.stage = 'won' then new.lifecycle := 'client'; end if;
  end if;
  return new;
end $$;
create trigger contacts_on_update before update on public.contacts for each row execute function public.contacts_on_update();

alter table public.contacts enable row level security;
alter table public.contact_activities enable row level security;
alter table public.contact_tasks enable row level security;

create policy "staff read contacts" on public.contacts for select using (public.is_staff());
create policy "staff add contacts" on public.contacts for insert with check (public.is_staff());
create policy "staff update contacts" on public.contacts for update using (public.is_staff()) with check (public.is_staff());
create policy "admins delete contacts" on public.contacts for delete using (public.is_admin());

create policy "staff read activities" on public.contact_activities for select using (public.is_staff());
create policy "staff log activities" on public.contact_activities for insert with check (public.is_staff() and author = auth.uid());
create policy "authors and admins delete activities" on public.contact_activities for delete using (public.is_admin() or author = auth.uid());

create policy "staff read tasks" on public.contact_tasks for select using (public.is_staff());
create policy "staff add tasks" on public.contact_tasks for insert with check (public.is_staff());
create policy "staff update tasks" on public.contact_tasks for update using (public.is_staff()) with check (public.is_staff());
create policy "staff delete tasks" on public.contact_tasks for delete using (public.is_staff());
