-- Buildcaps Intelligence tools (M8, M10) and the SEO Growth Agent (M9).

-- ── Market history ─────────────────────────────────────────────────────────
-- Raw DLD rows are kept for 24 months; these monthly medians cover the full
-- history so Regret Radar and the Data Room can look back further.
create table public.dld_area_monthly (
  area_name text not null,
  month date not null,
  sales integer not null check (sales > 0),
  median_ppsm numeric not null check (median_ppsm > 0),
  primary key (area_name, month)
);

alter table public.dld_area_monthly enable row level security;
create policy "public reads dld monthly" on public.dld_area_monthly for select using (true);

-- ── Promise Ledger ─────────────────────────────────────────────────────────
create type public.promise_status as enum ('pending', 'delivered', 'partly', 'broken');

create table public.developer_promises (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  developer_slug text not null references public.developers (slug) on update cascade on delete cascade,
  project_slug text references public.projects (slug) on update cascade on delete set null,
  category text not null check (category in ('handover', 'amenity', 'specification', 'payment', 'community', 'other')),
  promise jsonb not null check (public.is_localized(promise)),
  source text check (length(source) <= 300),
  due date,
  status public.promise_status not null default 'pending',
  evidence text check (length(evidence) <= 2000),
  evidence_url text check (evidence_url ~ '^https?://'),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create index developer_promises_dev_idx on public.developer_promises (developer_slug);

create trigger developer_promises_updated_at before update on public.developer_promises
  for each row execute function public.touch_updated_at();

alter table public.developer_promises enable row level security;
create policy "public reads published promises" on public.developer_promises for select using (published or public.is_staff());
create policy "editors manage promises" on public.developer_promises for all using (public.can_edit()) with check (public.can_edit());

-- ── Construction pulse (Handover Truth Score) ─────────────────────────────
create table public.project_progress (
  id uuid primary key default gen_random_uuid(),
  project_slug text not null references public.projects (slug) on update cascade on delete cascade,
  recorded_on date not null,
  progress numeric(4, 3) not null check (progress between 0 and 1),
  source text not null check (source in ('rera', 'site_visit', 'developer', 'satellite')),
  note text check (length(note) <= 500),
  unique (project_slug, recorded_on, source)
);

alter table public.project_progress enable row level security;
create policy "public reads progress" on public.project_progress for select using (true);
create policy "editors manage progress" on public.project_progress for all using (public.can_edit()) with check (public.can_edit());

-- Tower height (Future Skyline View) and launch date (expected progress curve).
alter table public.projects
  add column floors integer check (floors between 1 and 250),
  add column launched_on date;

-- ── Leads from the tools ──────────────────────────────────────────────────
alter table public.leads drop constraint leads_kind_check;
alter table public.leads add constraint leads_kind_check
  check (kind in ('enquiry', 'newsletter', 'guide', 'report', 'bloc', 'valuation', 'match'));

-- Buyer Bloc progress: how many distinct investors joined a launch's bloc.
-- Security definer so the count is public while lead rows stay private.
create function public.bloc_interest(p_project text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct lower(email))::integer from public.leads where kind = 'bloc' and interest = p_project;
$$;

revoke execute on function public.bloc_interest(text) from public;
grant execute on function public.bloc_interest(text) to anon, authenticated;

-- ── SEO Growth Agent ──────────────────────────────────────────────────────
create table public.seo_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('dry_run', 'live')),
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  summary text,
  report jsonb not null default '{}'::jsonb
);

create type public.seo_status as enum ('proposed', 'applied', 'rejected', 'rolled_back', 'kept');

create table public.seo_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid references public.seo_runs (id) on delete set null,
  locale text not null,
  pathname text not null check (pathname ~ '^/'),
  kind text not null check (kind in ('meta', 'schema', 'internal_links', 'faq', 'content', 'new_page')),
  -- low: meta, schema and internal links may auto-apply; content waits for approval.
  risk text not null check (risk in ('low', 'content')),
  current jsonb,
  proposed jsonb not null,
  rationale text,
  evidence jsonb not null default '{}'::jsonb,
  status public.seo_status not null default 'proposed',
  applied_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  baseline jsonb,
  result jsonb
);

create index seo_proposals_status_idx on public.seo_proposals (status, created_at desc);

-- What the site actually renders: read by page metadata on every request.
create table public.seo_overrides (
  locale text not null,
  pathname text not null,
  title text check (length(title) <= 120),
  description text check (length(description) <= 320),
  faq jsonb,
  links jsonb,
  proposal_id uuid references public.seo_proposals (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (locale, pathname)
);

-- The override row before each change, so any change can be rolled back.
create table public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  proposal_id uuid not null references public.seo_proposals (id) on delete cascade,
  locale text not null,
  pathname text not null,
  before jsonb
);

-- Search Console page metrics, one row per page per weekly window.
create table public.seo_metrics (
  page text not null,
  period_end date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric not null default 0,
  position numeric,
  queries jsonb not null default '[]'::jsonb,
  primary key (page, period_end)
);

alter table public.seo_runs enable row level security;
alter table public.seo_proposals enable row level security;
alter table public.seo_overrides enable row level security;
alter table public.seo_snapshots enable row level security;
alter table public.seo_metrics enable row level security;

create policy "public reads seo overrides" on public.seo_overrides for select using (true);
create policy "staff read seo runs" on public.seo_runs for select using (public.is_staff());
create policy "staff read seo proposals" on public.seo_proposals for select using (public.is_staff());
create policy "staff read seo snapshots" on public.seo_snapshots for select using (public.is_staff());
create policy "staff read seo metrics" on public.seo_metrics for select using (public.is_staff());
-- Approvals and rollbacks run through server actions with the service role,
-- after checking the signed-in user is an admin.

-- Annual price per sqm per DLD area (sales-weighted), for the market model.
create function public.dld_annual(p_areas text[])
returns table (area_name text, year integer, sales integer, ppsm numeric)
language sql
stable
as $$
  select area_name, extract(year from month)::integer, sum(sales)::integer, round(sum(median_ppsm * sales) / sum(sales))
  from public.dld_area_monthly
  where area_name = any (p_areas)
  group by 1, 2
  order by 1, 2;
$$;
