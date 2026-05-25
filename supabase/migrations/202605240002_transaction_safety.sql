-- Minimal safety hardening for transaction writes and audit retention.
-- Run after 202605240001_audit_logs.sql.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_money_nonnegative'
  ) then
    alter table public.transactions
      add constraint transactions_money_nonnegative
      check (money_in >= 0 and money_out >= 0)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_single_money_direction'
  ) then
    alter table public.transactions
      add constraint transactions_single_money_direction
      check (
        money_in + money_out > 0
        and (money_in = 0 or money_out = 0)
      )
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_required_text'
  ) then
    alter table public.transactions
      add constraint transactions_required_text
      check (
        btrim(account) <> ''
        and btrim(source) <> ''
        and btrim(currency) ~ '^[A-Z]{3}$'
        and btrim(category) <> ''
        and btrim(tax_line) <> ''
      )
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_reasonable_date'
  ) then
    alter table public.transactions
      add constraint transactions_reasonable_date
      check (date between date '2000-01-01' and date '2100-12-31')
      not valid;
  end if;
end $$;

create or replace function public.prevent_audit_logs_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are append-only and cannot be %', tg_op;
end;
$$;

drop trigger if exists audit_logs_prevent_update on public.audit_logs;
create trigger audit_logs_prevent_update
before update on public.audit_logs
for each row execute function public.prevent_audit_logs_update_delete();

drop trigger if exists audit_logs_prevent_delete on public.audit_logs;
create trigger audit_logs_prevent_delete
before delete on public.audit_logs
for each row execute function public.prevent_audit_logs_update_delete();
