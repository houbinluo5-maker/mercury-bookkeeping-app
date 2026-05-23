-- Supabase schema for the Mercury Bookkeeping MVP.
-- Run this in the Supabase SQL editor before enabling SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY in the app environment.

create table if not exists public.categories (
  id text primary key,
  name text not null,
  type text not null check (type in ('Revenue', 'COGS', 'Expense', 'Equity', 'Transfer')),
  tax_line text not null,
  receipt_required_default boolean not null default true,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  date date not null,
  account text not null,
  source text not null,
  vendor text not null default '',
  description text not null default '',
  currency text not null default 'USD',
  money_in numeric(14, 2) not null default 0,
  money_out numeric(14, 2) not null default 0,
  category text not null default 'Uncategorized',
  tax_line text not null default 'Needs review',
  receipt_required boolean not null default true,
  receipt_link text not null default '',
  reconciled boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
  transaction_id text primary key references public.transactions(id) on delete cascade,
  receipt_required boolean not null default true,
  receipt_link text not null default '',
  reconciled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id text primary key default 'default' check (id = 'default'),
  company_name text not null,
  tax_year integer not null,
  default_currency text not null default 'USD',
  default_account_name text not null,
  bookkeeping_method text not null default 'cash' check (bookkeeping_method in ('cash', 'accrual')),
  business_type text not null default '',
  tax_notes text not null default '',
  language text not null default 'en' check (language in ('en', 'zh')),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions(date desc);
create index if not exists transactions_category_idx on public.transactions(category);
create index if not exists transactions_reconciled_idx on public.transactions(reconciled);
create index if not exists receipts_missing_idx
  on public.receipts(receipt_required, receipt_link)
  where receipt_required is true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.company_settings enable row level security;

-- No public RLS policies are created. The app accesses these tables only from
-- protected server-side API routes using the Supabase service role key.
