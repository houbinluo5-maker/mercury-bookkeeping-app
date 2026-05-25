# Monthly Closing Release Checklist

## Database

- [ ] Run `supabase/migrations/202605250001_monthly_closings.sql` in Supabase SQL editor.
- [ ] Verify `public.monthly_closings` exists.
- [ ] Verify RLS is enabled.
- [ ] Verify no public RLS policies exist.
- [ ] Verify `service_role` has select, insert, update, and delete permissions.

## Environment

- [ ] `SUPABASE_URL` unchanged.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` unchanged and server-only.
- [ ] `ADMIN_PASSWORD` unchanged.
- [ ] Vercel redeploy required only after code merge; no new environment variables are required.

## Verification

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm audit --json`

## Browser Smoke Tests

- [x] Login works by POSTing the admin password in local dev.
- [x] `/closing` opens with the existing auth cookie.
- [x] Monthly closing API returns localStorage fallback when Supabase is not configured.
- [ ] Month status cards render in a full browser session.
- [ ] Open month can be closed with checklist.
- [ ] Closed month shows badge on transactions.
- [ ] Editing a closed-period transaction requires reason.
- [ ] Audit log is created after closed-period edit.
- [ ] Reopen month requires reason.
- [ ] Tax Package shows closed/reopened status.
- [ ] CSV exports download.

## Rollback

- [ ] Revert application deployment to previous version if UI/API behavior fails.
- [ ] Keep `monthly_closings` table in place during rollback to preserve close history.
- [ ] If database rollback is required before production use, export `monthly_closings` first, then drop the table manually.

## Known Limitations

- Single admin identity is recorded as `admin`.
- localStorage fallback is editable by anyone with device/browser access.
- Closing does not replace professional CPA review.
- Closed-period corrections remain allowed with reason and audit history.
- Playwright was not available in the current REPL environment, so completed smoke coverage used authenticated HTTP route checks plus typecheck/lint/build/audit.
