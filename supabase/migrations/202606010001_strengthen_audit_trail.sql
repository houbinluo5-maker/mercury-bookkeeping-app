-- Strengthened workspace audit trail metadata and action set.
-- Run after 202605310001_export_audit_actions.sql.

alter table public.audit_logs add column if not exists actor_role text;
alter table public.audit_logs add column if not exists details jsonb not null default '{}'::jsonb;

update public.audit_logs
set actor_role = coalesce(nullif(actor_role, ''), actor)
where actor_role is null or actor_role = '';

create index if not exists audit_logs_actor_email_idx on public.audit_logs (actor_email);
create index if not exists audit_logs_actor_role_idx on public.audit_logs (actor_role);
create index if not exists audit_logs_details_gin_idx on public.audit_logs using gin (details);

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
      'settings_updated',
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
      'month_closed',
      'month_reopened',
      'close_note_updated',
      'workspace_claimed',
      'workspace_switched',
      'member_invited',
      'invitation_accepted',
      'invitation_revoked',
      'member_removed',
      'member_role_changed',
      'permission_denied',
      'report_exported',
      'tax_package_exported',
      'transactions_exported',
      'receipts_exported',
      'workspace_backup_exported',
      'export_denied'
    )
  );
