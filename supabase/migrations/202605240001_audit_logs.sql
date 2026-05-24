-- Audit trail schema for bookkeeping change history.
-- Run this after 202605230001_bookkeeping_schema.sql.

create table if not exists public.audit_logs (
  id text primary key,
  entity_type text not null check (
    entity_type in ('transaction', 'receipt', 'settings', 'category', 'reconciliation')
  ),
  entity_id text not null,
  action text not null check (
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
      'note_change'
    )
  ),
  field_name text not null default '',
  old_value text not null default '',
  new_value text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now(),
  actor text not null check (actor in ('admin', 'system')),
  source text not null check (
    source in ('manual', 'import', 'system', 'csv_import', 'receipt_upload')
  )
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action, source);

alter table public.audit_logs enable row level security;

-- No public RLS policies are created. The app accesses audit logs only
-- from protected server-side API routes using the Supabase service role key.
