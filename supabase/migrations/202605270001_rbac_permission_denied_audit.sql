-- RBAC permission denied audit support.
-- Run after 202605260003_team_invitations.sql.

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
      'workspace_claimed',
      'member_invited',
      'invitation_accepted',
      'invitation_revoked',
      'member_removed',
      'member_role_changed',
      'permission_denied'
    )
  );
