# ADR: Monthly Closing / Locked Accounting Periods

## Status

Accepted

## Context

The app supports transaction entry, imports, receipts, reconciliation, audit logs, reports, and CPA exports. After a month is reviewed, there is no durable record that the period was closed and no guardrail against later edits that change closed reports.

## Decision

Add a separate `monthly_closings` table and localStorage fallback record set. A closed period is not silently editable. Sensitive changes in closed periods require an admin reason and create audit log entries. Reopening also requires a reason and writes an audit entry.

## Why `monthly_closings` Is Separate

Monthly close state is period-level control metadata, not transaction data. A separate table avoids embedding mutable period state across many transaction rows, keeps reporting queries clear, and lets a zero-transaction month still have a closing record.

## Why Closed Periods Are Not Silently Editable

Silent edits after closing weaken CPA review and make exported reports less trustworthy. The app still permits legitimate corrections, but it requires intent, reason, and audit history.

## Why Changes After Closing Require Reasons and Audit Logs

Closed-period changes are high-integrity bookkeeping events. Reasons explain why the reviewed period changed, while audit logs preserve old/new values for review.

## localStorage Fallback Behavior

When Supabase is unavailable, monthly closing records are stored in browser localStorage alongside transactions and audit logs. This preserves usability but is not a substitute for server-side persistence, access control, or backup discipline.

## Integration With `audit_logs`

Closing and reopening use `entity_type = reconciliation`, `action = update`, `source = manual`, and `actor = admin`. Transaction edits keep existing field-level audit behavior and add required reasons when the transaction belongs to a closed period.

## Consequences

- Reports can flag closed and reopened periods.
- Supabase migration is required before production use.
- Local fallback remains available but must be backed up.
- More user prompts appear for legitimate corrections after closing.
