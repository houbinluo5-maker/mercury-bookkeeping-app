create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  auth_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  business_type text not null default 'US LLC',
  tax_year integer not null default 2026,
  default_currency text not null default 'USD',
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'bookkeeper', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists workspaces_owner_user_id_idx on public.workspaces (owner_user_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members (workspace_id);

insert into public.workspaces (id, name, business_type, tax_year, default_currency)
values ('legacy-workspace', 'Legacy Mercury Books Workspace', 'US LLC', 2026, 'USD')
on conflict (id) do nothing;

alter table public.transactions add column if not exists workspace_id text;
alter table public.categories add column if not exists workspace_id text;
alter table public.receipts add column if not exists workspace_id text;
alter table public.company_settings add column if not exists workspace_id text;
alter table public.audit_logs add column if not exists workspace_id text;
alter table public.audit_logs add column if not exists actor_user_id text;
alter table public.audit_logs add column if not exists actor_email text;
alter table public.monthly_closings add column if not exists workspace_id text;

do $$
begin
  if to_regclass('public.adjustment_entries') is not null then
    alter table public.adjustment_entries add column if not exists workspace_id text;
  end if;
end $$;

update public.transactions set workspace_id = 'legacy-workspace' where workspace_id is null;
update public.categories set workspace_id = 'legacy-workspace' where workspace_id is null;
update public.receipts set workspace_id = 'legacy-workspace' where workspace_id is null;
update public.company_settings set workspace_id = 'legacy-workspace' where workspace_id is null;
update public.audit_logs set workspace_id = 'legacy-workspace' where workspace_id is null;
update public.monthly_closings set workspace_id = 'legacy-workspace' where workspace_id is null;

do $$
begin
  if to_regclass('public.adjustment_entries') is not null then
    update public.adjustment_entries set workspace_id = 'legacy-workspace' where workspace_id is null;
  end if;
end $$;

alter table public.transactions alter column workspace_id set default 'legacy-workspace';
alter table public.categories alter column workspace_id set default 'legacy-workspace';
alter table public.receipts alter column workspace_id set default 'legacy-workspace';
alter table public.company_settings alter column workspace_id set default 'legacy-workspace';
alter table public.audit_logs alter column workspace_id set default 'legacy-workspace';
alter table public.monthly_closings alter column workspace_id set default 'legacy-workspace';

create index if not exists transactions_workspace_id_idx on public.transactions (workspace_id);
create index if not exists categories_workspace_id_idx on public.categories (workspace_id);
create index if not exists receipts_workspace_id_idx on public.receipts (workspace_id);
create index if not exists company_settings_workspace_id_idx on public.company_settings (workspace_id);
create index if not exists audit_logs_workspace_id_idx on public.audit_logs (workspace_id);
create index if not exists monthly_closings_workspace_id_idx on public.monthly_closings (workspace_id);

do $$
begin
  if to_regclass('public.adjustment_entries') is not null then
    create index if not exists adjustment_entries_workspace_id_idx on public.adjustment_entries (workspace_id);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

grant all on public.profiles to service_role;
grant all on public.workspaces to service_role;
grant all on public.workspace_members to service_role;
