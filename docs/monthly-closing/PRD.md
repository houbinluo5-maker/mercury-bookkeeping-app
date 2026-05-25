# Monthly Closing / Locked Accounting Periods PRD

## Problem

The bookkeeping app can import, classify, reconcile, audit, and export bookkeeping data, but a reviewed month remains freely editable. That makes accidental changes possible after reconciliation and weakens CPA confidence in monthly reports, tax package exports, and audit history.

## Goals

- Let the admin review monthly readiness and close a month after reconciliation review.
- Prevent accidental edits to transactions in closed accounting periods.
- Require a clear reason and audit log entries for sensitive closed-period changes.
- Allow reopening a closed month only with a required reason and audit trail.
- Show closing status in transaction, reconciliation, report, tax package, and audit workflows.
- Preserve Supabase persistence, ADMIN_PASSWORD protection, and localStorage fallback.

## Non-goals

- No hidden books, fake books, parallel ledgers, or inconsistent accounting states.
- No tax filing or legal advice.
- No multi-user approval workflow in this phase.
- No automated CPA sign-off.
- No changes to Mercury import classification rules beyond closed-period protections.

## User Flows

### Review and Close

1. Admin opens Monthly Closing.
2. Admin selects a tax year and reviews each month status card.
3. App shows transaction totals, revenue, expenses, net income, missing receipts, needs review, uncategorized, unreconciled, duplicate candidates, readiness score, and status.
4. Admin clicks Close Month.
5. App shows a checklist for receipts, review items, uncategorized transactions, reconciliation, duplicate candidates, tax package review, reconciliation review, and backup export.
6. If readiness is high enough, admin can close with a reason. If readiness is below threshold, admin must confirm override and provide a reason.
7. App stores the closing snapshot and creates an audit log.

### Closed-period Edit

1. Admin opens a transaction in a closed month.
2. App displays a Closed period badge.
3. Sensitive field edits require a reason before saving.
4. App saves the edit and creates audit log entries with old value, new value, and reason.

### Closed-period Delete

1. Admin deletes a transaction in a closed month.
2. App displays a stronger warning and requires a reason.
3. App writes the audit log before deleting in Supabase mode.

### Reopen

1. Admin clicks Reopen Month on a closed month.
2. App requires a reason.
3. App marks the month reopened, saves reopened metadata, and creates an audit log.
4. Reports warn that CPA review may be needed.

## Data Model

`monthly_closings`

- `id`: stable key in `closing-YYYY-MM`
- `year`, `month`: reporting period identity
- `period_start`, `period_end`: inclusive date range
- `status`: `open`, `ready_to_close`, `closed`, or `reopened`
- `readiness_score`: 0 to 100 score from reconciliation data
- `closed_at`, `closed_by`, `close_reason`
- `reopened_at`, `reopened_by`, `reopen_reason`
- `summary_json`: closing snapshot with totals, issue counts, checklist, and export context
- `created_at`, `updated_at`

## Edge Cases

- Supabase unavailable: localStorage stores closing records and audit logs; UI clearly remains in local fallback mode.
- Month with no transactions: can remain open or be closed with a reason and zero-transaction snapshot.
- Reopened month later closed again: status returns to `closed`, with latest close reason and prior reopen reason retained.
- Transaction date changed from open month into closed month: reason required because the target date is closed.
- Transaction date changed from closed month into open month: reason required because the original transaction was in a closed period.
- Missing migration: API returns a Supabase table-missing error and localStorage remains usable.
- Existing audit log gaps: reports warn when closed-period changes cannot be counted.

## Acceptance Criteria

- `/closing` is protected by existing ADMIN_PASSWORD session middleware.
- Monthly Closing appears in sidebar as `Monthly Closing` in English and `月结锁账` in Simplified Chinese.
- Closing records are stored in Supabase when configured and in localStorage otherwise.
- Closing a month stores `summary_json` and writes an audit log with `entity_type = reconciliation`, `action = update`, `source = manual`, `actor = admin`, and the close reason.
- Reopening requires a reason and writes an audit log.
- Closed-period transaction sensitive edits require a reason.
- Closed-period transaction delete requires confirmation, reason, and audit log.
- Tax Package and Monthly Report show closing status for selected periods.
- CSV exports are available for monthly closing summary, closed-period changes, and closing checklist.

## Test Plan

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- Browser smoke tests:
  - Login works.
  - `/closing` opens.
  - Month cards render.
  - Month can be closed with checklist and reason.
  - Closed month badge appears on transactions.
  - Closed-period edit requires reason.
  - Closed-period edit creates an audit log.
  - Reopen requires reason.
  - Tax Package shows closing status.
  - CSV exports download.

## CPA / Bookkeeping Disclaimer

This app organizes bookkeeping data and audit history for review. It is not tax, legal, accounting, or financial advice. A qualified CPA, accountant, or tax professional should review the records before filing or relying on reports.
