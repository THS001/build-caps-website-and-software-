-- Buildcaps: AI layer and market data (M8).

-- Every agent run is logged; risky actions are drafts that a person approves.
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  trigger text not null,
  status text not null check (status in ('ok', 'error', 'skipped')),
  summary text,
  input jsonb,
  output jsonb,
  input_tokens integer,
  output_tokens integer,
  error text,
  created_at timestamptz not null default now()
);
create index agent_runs_created_idx on public.agent_runs (created_at desc);

-- Lead Nurture drafts: an advisor reviews, edits and sends.
create table public.lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  score smallint check (score between 0 and 100),
  reasoning text,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'discarded')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Dubai Land Department open transactions (Dubai Pulse), ingested by the Market Intel agent.
create table public.dld_transactions (
  id bigint generated always as identity primary key,
  transaction_id text unique,
  instance_date date not null,
  trans_group text,          -- Sales, Mortgages, Gifts
  reg_type text,             -- Off-Plan Properties, Existing Properties
  area_name text not null,   -- DLD area name, e.g. "Marsa Dubai"
  property_type text,        -- Unit, Villa, Land, Building
  property_sub_type text,    -- Flat, Villa, Office…
  rooms text,                -- Studio, 1 B/R, 2 B/R…
  area_sqm numeric(12, 2),
  worth_aed numeric(16, 2),
  price_per_sqm numeric(12, 2),
  project_name text,
  building_name text
);
create index dld_area_date_idx on public.dld_transactions (area_name, instance_date desc);

-- Which DLD area names make up each community (verify against the DLD area list).
alter table public.communities add column dld_areas text[] not null default '{}';

-- Verified Listing: AI photo checks, confirmed by an advisor.
alter table public.properties add column verification jsonb;
alter table public.properties add column verified_at timestamptz;

alter table public.agent_runs enable row level security;
alter table public.lead_followups enable row level security;
alter table public.dld_transactions enable row level security;

create policy "staff read agent runs" on public.agent_runs for select using (public.is_staff());
create policy "staff manage followups" on public.lead_followups for all using (public.is_staff()) with check (public.is_staff());
-- Open data: anyone may read it.
create policy "public reads dld" on public.dld_transactions for select using (true);

-- Comparable sales for an estimate: price per square metre quartiles.
create function public.dld_comparables(p_areas text[], p_rooms text, p_min_sqm numeric, p_max_sqm numeric, p_since date)
returns table (sales bigint, p25 numeric, median numeric, p75 numeric, latest date)
language sql stable as $$
  select count(*),
         percentile_cont(0.25) within group (order by price_per_sqm)::numeric,
         percentile_cont(0.5) within group (order by price_per_sqm)::numeric,
         percentile_cont(0.75) within group (order by price_per_sqm)::numeric,
         max(instance_date)
  from public.dld_transactions
  where area_name = any (p_areas)
    and (p_rooms is null or rooms = p_rooms)
    and area_sqm between p_min_sqm and p_max_sqm
    and instance_date >= p_since
    and coalesce(trans_group, 'Sales') = 'Sales'
    and price_per_sqm > 0
$$;

-- Monthly median price per square metre and volume, for charts and trend maths.
create function public.dld_monthly(p_areas text[], p_since date)
returns table (month date, median numeric, sales bigint)
language sql stable as $$
  select date_trunc('month', instance_date)::date,
         percentile_cont(0.5) within group (order by price_per_sqm)::numeric,
         count(*)
  from public.dld_transactions
  where area_name = any (p_areas)
    and instance_date >= p_since
    and coalesce(trans_group, 'Sales') = 'Sales'
    and price_per_sqm > 0
  group by 1
  order by 1
$$;
