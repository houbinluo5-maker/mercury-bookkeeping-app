# UI Redesign Release Checklist

## Pre-Release
- [ ] Confirm branch contains UI/documentation changes only.
- [ ] Confirm `ADMIN_PASSWORD` login still protects app pages.
- [ ] Confirm Supabase service role key remains server-only.
- [ ] Confirm receipt upload/delete flows still use protected routes.
- [ ] Confirm audit trail and monthly closing UI are still reachable.
- [ ] Confirm English and Simplified Chinese show one language at a time.

## Validation
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm audit --json`
- [x] Browser smoke fallback: login.
- [x] Browser smoke fallback: dashboard.
- [x] Browser smoke fallback: transactions.
- [x] Browser smoke fallback: receipts.
- [x] Browser smoke fallback: reconciliation center.
- [x] Browser smoke fallback: settings.
- [x] Browser smoke fallback: tax package.
- [ ] Playwright interactive language switching. Playwright is not installed in this workspace; use manual QA or add the existing lockfile dependency before running full interaction automation.

## Rollback
- Revert the UI redesign commit/PR.
- No database migration rollback is needed.
- No Vercel environment variable changes are required.

## Known Limitations
- This phase does not introduce new finance operations features.
- Some secondary pages may receive shared-system polish before deeper page-specific layout improvements.
