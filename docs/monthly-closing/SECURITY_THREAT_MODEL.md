# Security Threat Model: Monthly Closing / Locked Periods

## Scope

Monthly close records, closed-period transaction changes, audit logs, Supabase access, localStorage fallback, exports, and destructive transaction actions.

## Assets

- Transaction ledger integrity.
- Monthly closing status and summary snapshots.
- Audit logs with old/new values and reasons.
- Supabase service role key.
- Receipt links and receipt metadata.
- CPA and tax package export trustworthiness.

## Trust Boundaries

- Browser UI to protected Next.js API routes.
- API routes to Supabase REST API using server-only service role key.
- Browser localStorage fallback to user-controlled device storage.
- CSV/export generation from in-memory app data.

## Threats and Mitigations

### Unauthorized Closing or Reopening

- Threat: unauthenticated user closes or reopens a period.
- Existing control: ADMIN_PASSWORD session middleware protects app and API routes.
- Mitigation: monthly closing APIs call `isAuthenticatedRequest`.

### Accidental Deletion of Closed-period Transactions

- Threat: admin deletes a transaction after close without realizing report impact.
- Mitigation: UI shows closed-period warning, requires confirmation and reason, and creates audit log before Supabase delete.

### Missing Audit Logs

- Threat: closed-period changes occur without traceability.
- Existing control: transaction writes already generate audit logs.
- Mitigation: closed-period sensitive edits require reasons; Supabase write helpers reject transaction writes that should audit but produce no audit log.

### Supabase Service Role Exposure

- Threat: browser receives service role key and can bypass RLS.
- Existing control: service role is read only in server code.
- Mitigation: monthly closing APIs use server-side helpers only; no client Supabase writes.

### LocalStorage Fallback Risks

- Threat: local data can be changed or lost on the device.
- Mitigation: fallback is documented as continuity mode; release checklist requires Supabase migration and backup export for production use.

### Destructive Actions

- Threat: clear/reset/delete actions remove evidence.
- Existing control: transaction deletes create audit entries.
- Mitigation: closed-period delete requires reason and writes audit before delete in Supabase mode.

### Data Integrity

- Threat: monthly close summary no longer matches ledger after later edits.
- Mitigation: closed-period changes are auditable; reports warn when closed periods changed after closing or were reopened.

### CPA Export Trustworthiness

- Threat: CPA receives exports without knowing a period was reopened or changed.
- Mitigation: Tax Package shows closing status and warnings for reopened or changed closed periods.

## Assumptions

- Single admin user model remains intentional for this phase.
- ADMIN_PASSWORD is strong and stored only in environment variables.
- Supabase service role key is configured only in server/deployment environment.
- Browser localStorage is acceptable for development and fallback, not as a compliance-grade audit store.

## Open Follow-ups

- Add multi-admin identity and approvals if the app moves beyond single-admin use.
- Add immutable server-side audit export signing if CPA package integrity requirements increase.
- Add database triggers for audit enforcement if direct database writes become possible outside the app.
