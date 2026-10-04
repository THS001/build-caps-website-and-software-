-- M13: the remaining AI features.
-- Advisor Copilot (brief + after-meeting summary), Advisor Score with verified
-- reviews, Advisor Voice Notes, lifestyle search data and Translation QA.

/* ── Advisor Copilot ──────────────────────────────────────────────────── */

-- The pre-meeting brief is kept on the appointment (it is also emailed when
-- email is configured), and the after-meeting summary the advisor approved.
alter table public.appointments add column brief text;
alter table public.appointments add column outcome jsonb;
alter table public.appointments add column outcome_at timestamptz;

/* ── Advisor Score and verified reviews ───────────────────────────────── */

-- Recomputed nightly from the CRM: response time, show rate, reviews, deals.
alter table public.agents add column score jsonb;
alter table public.agents add column score_at timestamptz;

-- Only someone whose meeting actually took place can review (through the
-- private link in their booking emails, checked on the server). Staff approve
-- a review before it is shown.
create table public.advisor_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  agent_slug text not null references public.agents (slug) on update cascade on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (length(comment) <= 1500),
  first_name text check (length(first_name) <= 60),
  locale text not null default 'en',
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index advisor_reviews_agent_idx on public.advisor_reviews (agent_slug, published);

alter table public.advisor_reviews enable row level security;
create policy "published reviews are public" on public.advisor_reviews for select using (published);
create policy "staff read reviews" on public.advisor_reviews for select using (public.is_staff());
create policy "staff moderate reviews" on public.advisor_reviews for update using (public.is_staff()) with check (public.is_staff());
create policy "admins delete reviews" on public.advisor_reviews for delete using (public.is_admin());

/* ── Advisor Voice Notes ──────────────────────────────────────────────── */

-- One spoken intro per listing and language, written by Claude and read aloud
-- by the visitor's browser. Regenerated when the listing changes.
create table public.listing_intros (
  property_slug text not null,
  locale text not null,
  agent_slug text,
  script text not null check (length(script) <= 3000),
  property_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (property_slug, locale)
);
alter table public.listing_intros enable row level security;
create policy "intros are public" on public.listing_intros for select using (true);
create policy "staff clear intros" on public.listing_intros for delete using (public.can_edit());

/* ── Lifestyle search ─────────────────────────────────────────────────── */

-- Drive times to everyday destinations and the nearest school, metro, park,
-- supermarket and beach, from OpenStreetMap. Filled when a listing is saved.
-- { "commute": { "difc": 18, ... } (free-flow minutes),
--   "nearest": { "school": 0.6, "metro": 1.2, ... } (km), "at": iso }
alter table public.properties add column surroundings jsonb;

/* ── Translation QA ───────────────────────────────────────────────────── */

-- Back-translation and glossary checks on published translations. Flags only:
-- an editor fixes the text and resolves the flag.
create table public.translation_flags (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_key text not null,
  locale text not null,
  field text not null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  issue text not null,
  suggestion text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index translation_flags_open_idx on public.translation_flags (table_name, row_key) where resolved_at is null;

alter table public.translation_flags enable row level security;
create policy "staff read flags" on public.translation_flags for select using (public.is_staff());
create policy "editors resolve flags" on public.translation_flags for update using (public.can_edit()) with check (public.can_edit());
create policy "admins delete flags" on public.translation_flags for delete using (public.is_admin());
