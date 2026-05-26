-- Account linking / legacy workspace claim audit support.
-- Run after 202605260001_auth_workspaces.sql.

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'audit_logs_entity_type_check'
  ) then
    alter table public.audit_logs drop constraint audit_logs_entity_type_check;
  end if;
end $$;

alter table public.audit_logs
  add constraint audit_logs_entity_type_check
  check (entity_type in ('transaction', 'receipt', 'settings', 'category', 'reconciliation', 'workspace'));

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'audit_logs_action_check'
  ) then
    alter table public.audit_logs drop constraint audit_logs_action_check;
  end if;
end $$;

alter table public.audit_logs
  add constraint audit_logs_action_check
  check (
    action in (
      'create',
      'update',
      'delete',
      'upload_receipt',
      'replace_receipt',
      'delete_receipt',
      'manual_link_receipt',
      'mark_reconciled',
      'mark_unreconciled',
      'mark_receipt_not_required',
      'category_change',
      'tax_line_change',
      'resolve_review',
      'dismiss_duplicate',
      'note_change',
      'workspace_claimed'
    )
  );

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'audit_logs_source_check'
  ) then
    alter table public.audit_logs drop constraint audit_logs_source_check;
  end if;
end $$;

alter table public.audit_logs
  add constraint audit_logs_source_check
  check (source in ('manual', 'import', 'system', 'csv_import', 'receipt_upload', 'oauth_signup'));

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'audit_logs_actor_check'
  ) then
    alter table public.audit_logs drop constraint audit_logs_actor_check;
  end if;
end $$;

alter table public.audit_logs
  add constraint audit_logs_actor_check
  check (btrim(actor) <> '');
