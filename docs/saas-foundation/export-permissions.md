# Ledger Export Permissions

Phase 4 adds role-controlled ledger exports and export audit logging. It does not add billing, subscription plans, or changes to login/logout/OAuth.

## Permission Matrix

| Export | Owner | Admin | CPA | Viewer |
| --- | --- | --- | --- | --- |
| Monthly report | Yes | Yes | Yes | No |
| Quarterly report | Yes | Yes | Yes | No |
| Annual tax summary | Yes | Yes | Yes | No |
| Tax package workbook | Yes | Yes | Yes | No |
| Tax package CSV files | Yes | Yes | Yes | No |
| Transaction ledger export | Yes | Yes | Yes | No |
| Receipt exports / receipt files | Yes | Yes | Yes | No |
| Reconciliation exports | Yes | Yes | Yes | No |
| Audit log CSV | Yes | Yes | Yes | No |
| Full backup / workspace archive | Yes | No | No | No |

Legacy `bookkeeper` members keep operational report, transaction, and receipt export access, but not tax package or full backup access.

## Server Enforcement

Central permission helpers live in `lib/permissions.ts`:

- `canViewReports`
- `canExportReports`
- `canViewTaxPackage`
- `canExportTaxPackage`
- `canExportTransactions`
- `canExportReceipts`
- `canExportFullBackup`
- `canExportWorkspaceArchive`

Export type mapping and sanitized audit entry creation live in `lib/export-audit.ts`.

Server routes that return export/file data check export permissions before returning data:

- `GET /api/monthly-closings?export=summary`
- `GET /api/receipts/file`
- `GET /api/storage?export=backup`
- `POST /api/exports/audit`

Unauthorized export responses use HTTP `403 Forbidden`:

```json
{
  "error": "You do not have permission to export this data."
}
```

The existing `GET /api/storage` route remains the authenticated workspace data hydration path for the app. Full backup export intent is represented by `?export=backup` and is Owner-only.

## UI Behavior

Export buttons are hidden for roles that cannot perform that export. Pages remain viewable for read-only roles when the page itself is allowed.

Blocked users see:

- "Export is restricted for your role."
- "Ask the workspace owner for export access."

Full backup and workspace archive controls are Owner-only.

## Audit Logs

Successful export actions:

- `report_exported`
- `tax_package_exported`
- `transactions_exported`
- `receipts_exported`
- `workspace_backup_exported`

Denied export attempts:

- `export_denied`

Audit metadata includes actor email, actor role, workspace id, export type, report period when available, entity type, file name, and result. Audit logs do not include raw financial data, CSV contents, workbook contents, receipt file contents, or backup JSON contents.

The migration `supabase/migrations/202605310001_export_audit_actions.sql` extends the `audit_logs_action_check` constraint for the export actions.

## Manual QA Checklist

- Owner can export reports.
- Owner can export tax package.
- Owner can export transactions.
- Owner can export full backup / workspace archive when present.
- Admin can export operational reports and transaction exports.
- Admin cannot export full backup / workspace archive.
- CPA can export tax package and reports.
- CPA cannot export full backup / workspace archive.
- Viewer cannot export reports, tax package, transactions, receipts, or backup data.
- Unauthorized export API calls return `403`.
- Viewer export buttons are hidden and the export restriction message appears.
- Successful export audit logs are created.
- Denied export attempts create `export_denied` audit logs.
- Workspace switcher still works.
- Email login still works.
- Google login still works.
- Microsoft login still works.
- Team invite acceptance still works.
