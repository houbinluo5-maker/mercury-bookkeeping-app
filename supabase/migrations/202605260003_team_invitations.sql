-- Team invitations and workspace member lifecycle.
-- Run after 202605260002_account_linking_legacy_claim.sql.

alter table public.workspace_members add column if not exists email text;
alter table public.workspace_members add column if not exists normalized_email text;
alter table public.workspace_members add column if not exists status text not null default 'active';
alter table public.workspace_members add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.workspace_members add column if not exists invited_at timestamptz;
alter table public.workspace_members add column if not exists accepted_at timestamptz;
alter table public.workspace_members add column if not exists updated_at timestamptz not null default now();

update public.workspace_members wm
set
  email = coalesce(wm.email, p.email),
  normalized_email = coalesce(wm.normalized_email, lower(btrim(p.email))),
  status = coalesce(wm.status, 'active'),
  accepted_at = coalesce(wm.accepted_at, wm.created_at),
  updated_at = coalesce(wm.updated_at, now())
from public.profiles p
where wm.user_id = p.id;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'workspace_members_role_check'
  ) then
    alter table public.workspace_members drop constraint workspace_members_role_check;
  end if;
end $$;

alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'bookkeeper', 'viewer', 'cpa'));

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'workspace_members_status_check'
  ) then
    alter table public.workspace_members drop constraint workspace_members_status_check;
  end if;
end $$;

alter table public.workspace_members
  add constraint workspace_members_status_check
  check (status in ('active', 'invited', 'revoked'));

create index if not exists workspace_members_normalized_email_idx
  on public.workspace_members (workspace_id, normalized_email);

create table if not exists public.workspace_invitations (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  role text not null check (role in ('admin', 'viewer', 'cpa')),
  token text not null unique,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_invitations_workspace_status_idx
  on public.workspace_invitations (workspace_id, status);
create index if not exists workspace_invitations_normalized_email_idx
  on public.workspace_invitations (workspace_id, normalized_email);
create index if not exists workspace_invitations_token_idx
  on public.workspace_invitations (token);

alter table public.workspace_invitations enable row level security;
grant all on public.workspace_invitations to service_role;

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
      'member_role_changed'
    )
  );
