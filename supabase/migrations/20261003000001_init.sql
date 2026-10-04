-- Buildcaps: core schema (M6). Content, funnels, leads and staff roles.
-- Appointments arrive in M7, SEO agent tables in M9.
--
-- Security model
--   * The public (anon key) can read published content only, and can insert
--     leads and funnel clicks. It can never read leads, clicks or drafts.
--   * Staff are users with a role in public.profiles. New sign-ups get NO role,
--     so an account alone grants nothing. Disable public sign-ups in Supabase Auth.
--   * Localised text is jsonb: {"en": "...", "ar": "..."}; English is required.


-- ── Types ──────────────────────────────────────────────────────────────
create type public.staff_role as enum ('admin', 'editor', 'advisor');
create type public.property_status as enum ('offPlan', 'ready');
create type public.listing_type as enum ('sale', 'rent');
create type public.property_type as enum ('apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'plot', 'office', 'retail');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');

-- Localised text must at least have English.
create function public.is_localized(value jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(value) = 'object' and coalesce(length(value ->> 'en'), 0) > 0
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Staff ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.staff_role, -- null = no access
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role checks used by every policy. Security definer so they can read profiles under RLS.
create function public.current_staff_role() returns public.staff_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable as $$ select public.current_staff_role() is not null $$;

create function public.can_edit() returns boolean
language sql stable as $$ select public.current_staff_role() in ('admin', 'editor') $$;

create function public.is_admin() returns boolean
language sql stable as $$ select public.current_staff_role() = 'admin' $$;

-- ── Content ────────────────────────────────────────────────────────────
create table public.communities (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  summary jsonb not null check (public.is_localized(summary)),
  lifestyle jsonb not null default '{"en": ""}'::jsonb,
  schools jsonb not null default '{"en": ""}'::jsonb,
  transport jsonb not null default '{"en": ""}'::jsonb,
  avg_price_per_sqft integer,
  est_yield numeric(5, 4),
  price_change_12m numeric(5, 4),
  lat double precision not null,
  lng double precision not null,
  waterfront boolean not null default false,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.developers (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  founded integer,
  summary jsonb not null check (public.is_localized(summary)),
  logo_url text,
  -- Track record stays null until verified (DLD registry, handover records).
  delivered_projects integer,
  on_time_rate numeric(5, 4),
  promises_kept numeric(5, 4),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.agents (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  role text not null check (role in ('propertyAdvisor', 'seniorPropertyAdvisor', 'salesDirector', 'ceo')),
  languages text[] not null default '{en}',
  specialties text[] not null default '{}',
  bio jsonb not null default '{"en": ""}'::jsonb,
  brn text,
  photo_url text,
  responds_within text not null default '1h',
  calendar_id text, -- Google Calendar used for availability (M7)
  active boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);

create table public.projects (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  developer_slug text not null references public.developers (slug) on update cascade,
  community_slug text not null references public.communities (slug) on update cascade,
  summary jsonb not null check (public.is_localized(summary)),
  launch_price_aed bigint check (launch_price_aed > 0),
  handover date not null,
  payment_plan jsonb not null,
  unit_types text,
  construction_progress numeric(4, 3) not null default 0 check (construction_progress between 0 and 1),
  escrow_registered boolean not null default false,
  lat double precision not null,
  lng double precision not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (public.is_localized(title)),
  description jsonb not null check (public.is_localized(description)),
  status public.property_status not null,
  listing public.listing_type not null default 'sale',
  type public.property_type not null,
  community_slug text not null references public.communities (slug) on update cascade,
  developer_slug text references public.developers (slug) on update cascade,
  project_slug text references public.projects (slug) on update cascade,
  price_aed bigint check (price_aed is null or price_aed > 0), -- null = price on request
  beds smallint not null check (beds between 0 and 20),
  baths smallint not null check (baths between 0 and 20),
  sqft integer not null check (sqft > 0),
  handover date,
  payment_plan jsonb,
  est_yield numeric(5, 4),
  service_charge_per_sqft numeric(8, 2),
  furnishing text check (furnishing in ('furnished', 'unfurnished', 'partly')),
  amenities text[] not null default '{}',
  images jsonb not null default '[]'::jsonb, -- [{ "src": url, "alt": { "en": ... } }]
  keywords text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  -- Dubai law: every property advert carries its DLD (Trakheesi) permit.
  permit text not null check (length(trim(permit)) > 0),
  permit_qr_url text,
  agent_slug text references public.agents (slug) on update cascade on delete set null,
  featured boolean not null default false,
  badge text check (badge in ('newLaunch', 'exclusive', 'soldOut')),
  seo jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An off-plan unit can't be "for rent" (an audit finding on the old site).
  constraint off_plan_is_for_sale check (not (status = 'offPlan' and listing = 'rent')),
  constraint ready_has_no_handover check (status = 'offPlan' or handover is null)
);

create index properties_published_idx on public.properties (published, featured, published_at desc);
create index properties_community_idx on public.properties (community_slug);

create table public.funnels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (public.is_localized(title)),
  pitch jsonb not null check (public.is_localized(pitch)),
  key_number jsonb not null, -- { "label": { "en": ... }, "value": "AED 1.65M" }
  tag jsonb not null check (public.is_localized(tag)),
  image_url text,
  external_url text not null check (external_url ~ '^https://'),
  starts_at date not null default current_date,
  ends_at date check (ends_at is null or ends_at >= starts_at),
  locales text[], -- null = every language
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.funnel_clicks (
  id bigint generated always as identity primary key,
  funnel_id uuid not null references public.funnels (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  source text check (length(source) <= 120),
  locale text check (length(locale) <= 8),
  utm jsonb not null default '{}'::jsonb,
  referrer text check (length(referrer) <= 500)
);

create index funnel_clicks_funnel_idx on public.funnel_clicks (funnel_id, clicked_at desc);

create table public.posts (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (public.is_localized(title)),
  excerpt jsonb not null check (public.is_localized(excerpt)),
  body jsonb not null default '[]'::jsonb, -- array of localised paragraphs
  category text not null check (category in ('market', 'guides', 'offPlan', 'communities', 'news')),
  author text not null default 'Buildcaps Research',
  cover_url text,
  minutes smallint not null default 5,
  published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.reports (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (public.is_localized(title)),
  quarter text not null,
  summary jsonb not null check (public.is_localized(summary)),
  file_path text, -- private storage path, emailed after the gate
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.jobs (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (public.is_localized(title)),
  location text not null default 'Dubai',
  type jsonb not null default '{"en": "Full time"}'::jsonb,
  summary jsonb not null check (public.is_localized(summary)),
  requirements jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── Leads (every form on the site) ─────────────────────────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('enquiry', 'newsletter', 'guide', 'report')),
  name text check (length(name) <= 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone text check (length(phone) <= 40),
  interest text check (length(interest) <= 40),
  message text check (length(message) <= 4000),
  country text check (length(country) <= 80),
  locale text check (length(locale) <= 8),
  source text check (length(source) <= 200),
  utm jsonb not null default '{}'::jsonb,
  status public.lead_status not null default 'new',
  assigned_agent text references public.agents (slug) on update cascade on delete set null,
  notes text
);

create index leads_created_idx on public.leads (created_at desc);

-- ── updated_at triggers ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['communities', 'developers', 'agents', 'projects', 'properties', 'funnels', 'posts', 'reports', 'jobs'] loop
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Stamp published_at the first time a listing or post goes live.
create function public.stamp_published_at() returns trigger
language plpgsql as $$
begin
  if new.published and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;

create trigger stamp_properties before insert or update on public.properties for each row execute function public.stamp_published_at();
create trigger stamp_posts before insert or update on public.posts for each row execute function public.stamp_published_at();

-- ── Row Level Security ─────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.developers enable row level security;
alter table public.agents enable row level security;
alter table public.projects enable row level security;
alter table public.properties enable row level security;
alter table public.funnels enable row level security;
alter table public.funnel_clicks enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.jobs enable row level security;
alter table public.leads enable row level security;

-- Profiles: you see yourself; admins see and manage everyone.
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage roles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Published content is public; staff see drafts; admins and editors write.
do $$
declare t text;
begin
  foreach t in array array['communities', 'developers', 'projects', 'properties', 'posts', 'reports', 'jobs'] loop
    execute format('create policy "public reads published" on public.%I for select using (published or public.is_staff())', t);
    execute format('create policy "editors insert" on public.%I for insert with check (public.can_edit())', t);
    execute format('create policy "editors update" on public.%I for update using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "admins delete" on public.%I for delete using (public.is_admin())', t);
  end loop;
end $$;

create policy "public reads active agents" on public.agents for select using (active or public.is_staff());
create policy "editors manage agents" on public.agents for all using (public.can_edit()) with check (public.can_edit());

create policy "public reads active funnels" on public.funnels for select using (active or public.is_staff());
create policy "editors manage funnels" on public.funnels for all using (public.can_edit()) with check (public.can_edit());

-- Clicks and leads: anyone may add one; only staff can read them.
create policy "anyone logs a click" on public.funnel_clicks for insert with check (true);
create policy "staff read clicks" on public.funnel_clicks for select using (public.is_staff());

create policy "anyone submits a lead" on public.leads for insert with check (status = 'new' and assigned_agent is null and notes is null);
create policy "staff read leads" on public.leads for select using (public.is_staff());
create policy "staff update leads" on public.leads for update using (public.is_staff()) with check (public.is_staff());
create policy "admins delete leads" on public.leads for delete using (public.is_admin());

-- ── Storage: listing photos, floor plans, permit QR codes ──────────────
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;

create policy "public reads media" on storage.objects for select using (bucket_id = 'media');
create policy "editors upload media" on storage.objects for insert with check (bucket_id = 'media' and public.can_edit());
create policy "editors update media" on storage.objects for update using (bucket_id = 'media' and public.can_edit());
create policy "editors delete media" on storage.objects for delete using (bucket_id = 'media' and public.can_edit());
