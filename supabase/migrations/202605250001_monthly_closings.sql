-- Monthly closing / locked accounting periods.
-- Run after 202605240002_transaction_safety.sql.

create table if not exists public.monthly_closings (
  id text primary key,
  year integer not null,
  month integer not null,
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('open', 'ready_to_close', 'closed', 'reopened')),
  readiness_score integer not null default 0,
  closed_at timestamptz,
  closed_by text,
  reopened_at timestamptz,
  reopened_by text,
  close_reason text not null default '',
  reopen_reason text not null default '',
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month),
  check (month between 1 and 12),
  check (readiness_score between 0 and 100),
  check (period_start <= period_end)
);

create index if not exists monthly_closings_year_month_idx on public.monthly_closings(year, month);
create index if not exists monthly_closings_status_idx on public.monthly_closings(status);
create index if not exists monthly_closings_period_idx on public.monthly_closings(period_start, period_end);

drop trigger if exists monthly_closings_set_updated_at on public.monthly_closings;
create trigger monthly_closings_set_updated_at
before update on public.monthly_closings
for each row execute function public.set_updated_at();

alter table public.monthly_closings enable row level security;

grant select, insert, update, delete on public.monthly_closings to service_role;

-- No public RLS policies are created. The app accesses this table only from
-- protected server-side API routes using the Supabase service role key.
