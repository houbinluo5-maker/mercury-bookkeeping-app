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
  created_at: string; // UTC ISO timestamp
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

## Time Display

Audit timestamps are stored as UTC ISO strings in `created_at`. Do not rewrite or backfill stored audit times into local time.

The Audit Trail UI formats `created_at` for China time only at display time:

- Timezone: `Asia/Shanghai`
- Offset: UTC+8
- English display example: `Jun 1, 2026, 14:37`
- Chinese display example: `2026年6月1日 14:37`

Exports and API payloads may continue to expose the stored UTC timestamp for reconciliation and debugging.

## Transaction Details

Transaction create/delete audit details should include safe structured fields:

```ts
{
  result: "success",
  transaction_date: "2026-06-01",
  merchant: "Meta Platforms",
  source_name: "元平台",
  description: "Paid social advertising spend",
  category: "Advertising",
  type: "expense",
  amount: 400,
  currency: "USD",
  receipt_status: "missing_receipt",
  reconciliation_status: "reconciled",
  summary: "2026-06-01 | Meta Platforms | out 400 USD | Advertising"
}
```

Readable detail examples:

- English: `Created transaction: Meta Platforms, advertising expense, expense $400.00, date Jun 1, 2026, reconciled, missing receipt.`
- Chinese: `创建交易：Meta Platforms 元平台，广告费用，支出 $400.00，日期 2026年6月1日，已核对，缺失收据。`
- Delete: `Deleted transaction: Meta Platforms, Advertising, expense $400.00, date Jun 1, 2026.`
- Category change: `Changed category for Meta Platforms, expense $400.00: Uncategorized -> Advertising.`
- Reconciliation: `Marked transaction reconciled: Meta Platforms, expense $400.00.`

Existing older logs may only have `summary`, `old_value`, or `new_value`. The UI should parse those when safe and otherwise fall back to a concise sentence such as `Created transaction {entity_id}.`

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
The Time column displays China time with a `UTC+8` or `北京时间` label while preserving the stored UTC value.

## Manual QA Checklist

- Owner can view full Audit Trail.
- Admin can view operational audit logs.
- CPA can view report, tax package, receipt, transaction, and export-related audit logs.
- Viewer behavior follows `canViewAuditTrail`.
- Creating a transaction writes an audit log.
- Transaction create details show merchant, category, type, amount, date, reconciliation, and receipt status.
- Updating category, tax line, note, reconciliation, and receipt fields writes specific audit actions.
- Category changes show old category -> new category.
- Reconciliation changes mention the transaction merchant/amount when available.
- Deleting a transaction writes an audit log.
- Transaction delete details show merchant, category, type, amount, and date.
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
- Audit Trail time displays in Asia/Shanghai / UTC+8 while stored `created_at` remains UTC.
- Audit details do not expose secrets, tokens, API keys, receipt file contents, or full CSV contents.
