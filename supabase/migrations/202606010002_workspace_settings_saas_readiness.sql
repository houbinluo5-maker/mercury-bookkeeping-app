alter table public.company_settings add column if not exists workspace_name text not null default 'Mercury Books Workspace';
alter table public.company_settings add column if not exists company_legal_name text not null default '';
alter table public.company_settings add column if not exists dba_name text not null default '';
alter table public.company_settings add column if not exists business_model text not null default 'Ecommerce';
alter table public.company_settings add column if not exists ein_tax_id text not null default '';
alter table public.company_settings add column if not exists registered_state text not null default '';
alter table public.company_settings add column if not exists business_address text not null default '';
alter table public.company_settings add column if not exists contact_email text not null default '';
alter table public.company_settings add column if not exists finance_contact_name text not null default '';
alter table public.company_settings add column if not exists country_region text not null default 'United States';
alter table public.company_settings add column if not exists timezone_display text not null default 'Asia/Shanghai';
alter table public.company_settings add column if not exists require_receipts_over_threshold boolean not null default true;
alter table public.company_settings add column if not exists receipt_required_threshold_amount numeric(14, 2) not null default 75;
alter table public.company_settings add column if not exists monthly_close_reminder_day integer not null default 5;
alter table public.company_settings add column if not exists lock_closed_months boolean not null default true;
alter table public.company_settings add column if not exists allow_admins_reopen_months boolean not null default false;
alter table public.company_settings add column if not exists cpa_read_only_note text not null default '';
alter table public.company_settings add column if not exists default_category_fallback text not null default 'Uncategorized';
alter table public.company_settings add column if not exists data_retention_policy text not null default '7_years';
alter table public.company_settings add column if not exists receipt_retention_policy text not null default '7_years';
alter table public.company_settings add column if not exists export_watermark_preference text not null default 'workspace_name';

update public.company_settings
set
  workspace_name = coalesce(nullif(workspace_name, ''), company_name, 'Mercury Books Workspace'),
  company_legal_name = coalesce(nullif(company_legal_name, ''), company_name, ''),
  dba_name = coalesce(nullif(dba_name, ''), company_name, ''),
  business_model = coalesce(nullif(business_model, ''), 'Ecommerce'),
  country_region = coalesce(nullif(country_region, ''), 'United States'),
  timezone_display = coalesce(nullif(timezone_display, ''), 'Asia/Shanghai'),
  cpa_read_only_note = coalesce(nullif(cpa_read_only_note, ''), 'CPA users can review reports, transactions, receipts, audit history, and export tax package data without changing workspace settings.')
where id = 'default';

update public.company_settings
set workspace_id = 'legacy-workspace'
where workspace_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'company_settings'
      and constraint_name = 'company_settings_pkey'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.company_settings drop constraint company_settings_pkey;
  end if;
end $$;

alter table public.company_settings alter column workspace_id set not null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'company_settings'
      and constraint_name = 'company_settings_pkey'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.company_settings add constraint company_settings_pkey primary key (workspace_id, id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_settings_timezone_display_check'
  ) then
    alter table public.company_settings
      add constraint company_settings_timezone_display_check
      check (timezone_display in ('Asia/Shanghai', 'UTC'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'company_settings_retention_policy_check'
  ) then
    alter table public.company_settings
      add constraint company_settings_retention_policy_check
      check (data_retention_policy in ('7_years', '5_years', 'indefinite'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'company_settings_receipt_retention_policy_check'
  ) then
    alter table public.company_settings
      add constraint company_settings_receipt_retention_policy_check
      check (receipt_retention_policy in ('7_years', '5_years', 'indefinite'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'company_settings_export_watermark_check'
  ) then
    alter table public.company_settings
      add constraint company_settings_export_watermark_check
      check (export_watermark_preference in ('workspace_name', 'confidential', 'none'));
  end if;
end $$;
