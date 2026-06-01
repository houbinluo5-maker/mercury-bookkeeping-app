# Audit Trail

Mercury Books audit events are workspace-scoped, append-only records for sensitive bookkeeping, team, workspace, permission, and export activity.

## Event Schema

Normalized audit events use this shape:

```ts
{
  workspace_id: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_role?: "owner" | "admin" | "viewer" | "cpa" | "bookkeeper" | "unknown";
  action: AuditAction;
  entity_type: "transaction" | "receipt" | "settings" | "category" | "reconciliation" | "workspace";
  entity_id: string;
  source: "manual" | "import" | "system" | "csv_import" | "receipt_upload" | "oauth_signup";
  details: Record<string, unknown>;
  created_at: string;
}
```

Legacy fields remain available for compatibility:

- `actor`
- `field_name`
- `old_value`
- `new_value`
- `reason`

## Actions

Transaction and reconciliation:

- `create`
- `update`
- `delete`
- `category_change`
- `tax_line_change`
- `note_change`
- `mark_reconciled`
- `mark_unreconciled`
- `mark_receipt_not_required`
- `resolve_review`
- `dismiss_duplicate`

Receipts:

- `upload_receipt`
- `replace_receipt`
- `delete_receipt`
- `manual_link_receipt`

Monthly close:

- `month_closed`
- `month_reopened`
- `close_note_updated`

Team and workspace:

- `workspace_claimed`
- `workspace_switched`
- `settings_updated`
- `member_invited`
- `invitation_accepted`
- `invitation_revoked`
- `member_removed`
- `member_role_changed`

Security and exports:

- `permission_denied`
- `report_exported`
- `tax_package_exported`
- `transactions_exported`
- `receipts_exported`
- `workspace_backup_exported`
- `export_denied`

## Sources

- `manual`: user action from the app UI.
- `import`: app import flow.
- `system`: app-generated maintenance or seed-data actions.
- `csv_import`: committed Mercury CSV import.
- `receipt_upload`: receipt file upload, replace, or delete flow.
- `oauth_signup`: account or workspace creation during OAuth signup.

## Redaction Rules

Audit details are sanitized before normalization and insert. The sanitizer redacts keys or inline values that look like:

- passwords
- OAuth codes and code verifiers
- access tokens
- refresh tokens
- bearer tokens
- API keys
- service role keys
- client secrets
- cookies

Audit logs must not include:

- raw financial file contents
- full CSV contents
- receipt file contents
- service role keys
- OAuth tokens
- passwords

Transaction metadata, receipt paths, entity ids, period labels, changed field names, and safe summaries may be logged.

## Role Visibility

Owner:

- Full workspace audit visibility.

Admin and Bookkeeper:

- Operational audit logs for transactions, receipts, reconciliation, monthly close, exports, permission denials, and invite activity.
- Owner-only settings and member-management details stay hidden unless they are operational invite events.

CPA:

- Tax and review-relevant logs for transactions, receipts, reconciliation, monthly close, and report/tax/receipt/transaction exports.
- Member management and owner-only settings details are hidden.

Viewer:

- Viewer access follows `canViewAuditTrail`.
- When allowed, Viewer receives read-only review-relevant logs, not owner-only team or settings details.

## UI Behavior

The Audit Trail page shows the newest 100 matching logs by default and supports previous/next pagination. Filters include:

- date range
- action
- actor email
- entity type
- source
- result: success or denied

Search covers safe text only:

- actor email
- action
- entity id
- source
- readable details
- reason

Rows display readable details instead of raw JSON whenever possible.

## Manual QA Checklist

- Owner can view full Audit Trail.
- Admin can view operational audit logs.
- CPA can view report, tax package, receipt, transaction, and export-related audit logs.
- Viewer behavior follows `canViewAuditTrail`.
- Creating a transaction writes an audit log.
- Updating category, tax line, note, reconciliation, and receipt fields writes specific audit actions.
- Deleting a transaction writes an audit log.
- Uploading, replacing, deleting, and manually linking receipts writes audit logs.
- Reconciliation actions write `mark_reconciled`, `mark_unreconciled`, `mark_receipt_not_required`, `resolve_review`, and `dismiss_duplicate` logs.
- Monthly close and reopen write `month_closed` and `month_reopened`.
- Team invite, invitation accept/revoke, member removal, and role change write team logs.
- Workspace switch writes `workspace_switched`.
- Settings changes write `settings_updated`.
- Export success writes the correct export action.
- Export denied writes `export_denied`.
- Permission denied mutations write `permission_denied`.
- Date, action, actor email, entity type, source, result filters work.
- Search works for actor, action, entity id, and safe detail text.
- Pagination limits visible rows to 100 per page.
- Audit details do not expose secrets, tokens, API keys, receipt file contents, or full CSV contents.
