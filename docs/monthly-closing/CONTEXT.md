# Monthly Closing Context

## Existing Capabilities

- Next.js, TypeScript, and Tailwind bookkeeping app for a US LLC ecommerce workflow.
- ADMIN_PASSWORD login protection through server-side session cookies.
- Supabase REST persistence through server-only service role calls.
- Browser localStorage fallback when Supabase is not configured or unavailable.
- Transactions with receipt, reconciliation, category, tax line, notes, and audit metadata.
- Chart of accounts and category defaults.
- Supabase Storage receipt uploads through protected API routes.
- Mercury CSV import.
- Reconciliation Center with issue detection for missing receipts, needs review, uncategorized, unreconciled, duplicate candidates, revenue deposits, owner activity, internal transfers, and tax package blockers.
- Audit Trail stored in `audit_logs`.
- Monthly, quarterly, annual tax summaries.
- CPA / Tax Package exports.
- English and Simplified Chinese language switch through `lib/i18n.ts`.

## Relevant Dependencies

### Supabase Persistence

Server-side helpers in `lib/supabase-server.ts` use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Browser code does not receive the service role key. API routes return local-mode responses when Supabase is not configured.

### `audit_logs`

Audit entries are built in `lib/audit.ts`, persisted through Supabase APIs when available, and retained in localStorage fallback. Monthly closing uses `entity_type = reconciliation` so it appears beside reconciliation and close-readiness history.

### `transactions`

Transactions are the source of monthly totals and lock enforcement. Sensitive fields are date, money in/out, category, tax line, receipt requirement/link, reconciled, source, vendor, description, and notes.

### `receipts`

Receipt status is part of monthly readiness. Receipt link edits in closed periods require a reason.

### Reconciliation Center

`lib/reconciliation.ts` already calculates the readiness score and issue counts needed by closing cards and checklist CSV exports.

### Tax Package

Tax Package exports should show closed/reopened status and warn when periods in the selected range were reopened or changed after closing.

### localStorage Fallback

Fallback remains a continuity feature, not a compliance boundary. Closing records and audit logs are stored locally when Supabase is unavailable, and users should export backups before relying on local data.

## Engineering Plan

### Data Model

Add `monthly_closings` as a separate Supabase table keyed by `closing-YYYY-MM`. Client types mirror the table and localStorage stores the same records.

### API Routes

Add protected `/api/monthly-closings` route supporting list, close, reopen, summary update, status lookup, and CSV export. The route uses existing ADMIN_PASSWORD session protection and server-only Supabase helpers.

### UI Pages

Add `/closing` with tax year, status, month, and issue type filters. Cards show month-level totals, issues, readiness score, status, warnings, close/reopen actions, and exports.

### Storage Integration

Extend `BookkeepingProvider` with `monthlyClosings`, load/sync helpers, and close/reopen methods. Supabase mode writes through server APIs; local mode writes to localStorage.

### Audit Log Integration

Closing and reopening create reconciliation audit entries. Closed-period transaction edits reuse `buildTransactionAuditLogs` and require reasons for sensitive changes.

### Closed-period Edit Rules

Centralize period status and sensitive-field detection in `lib/monthly-closing.ts`. UI uses the same helpers for badges and prompts. Server APIs enforce required reasons in Supabase mode.

### Expected Files Changed

- `docs/monthly-closing/*`
- `docs/adr/ADR-monthly-closing-locked-periods.md`
- `supabase/migrations/*_monthly_closings.sql`
- `lib/types.ts`
- `lib/monthly-closing.ts`
- `lib/storage.tsx`
- `lib/supabase-server.ts`
- `app/api/monthly-closings/route.ts`
- `app/closing/page.tsx`
- Existing transaction, receipt, reconciliation, report, audit, tax package, nav, and README files for status badges and warnings.

### Risks and Mitigations

- Risk: audit logs missing for closed-period changes. Mitigation: require reasons in UI and Supabase API, and fail Supabase transaction writes when required audit entries are missing.
- Risk: service role key exposure. Mitigation: all Supabase writes remain server-side.
- Risk: localStorage fallback mistaken for compliance-grade audit log. Mitigation: documentation and UI warnings keep fallback framed as continuity backup.
- Risk: too much UI complexity. Mitigation: cards, badges, and warning boxes reuse existing design patterns.
