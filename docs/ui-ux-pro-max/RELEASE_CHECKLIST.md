# UI/UX Pro Max Release Checklist

## Scope
- [x] UI-only changes.
- [x] No database schema changes.
- [x] No Supabase credential changes.
- [x] No auth logic changes.
- [x] No receipt upload logic changes.
- [x] No audit/monthly closing/calculation changes.

## Validation
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm audit --json`
- [x] Login works.
- [x] Dashboard loads.
- [x] Transactions loads.
- [x] Receipts loads and upload UI appears.
- [x] Reconciliation Center loads.
- [x] Tax Package loads and export actions render.
- [x] Settings loads and Supabase status renders.
- [x] Supabase storage health endpoint responds.
- [ ] Language switch manual check. Playwright is not installed in this workspace, so full interaction automation is unavailable without adding the dependency.

## Rollback
- Revert the UI redesign PR.
- No database rollback required.
- No Vercel env changes required.
