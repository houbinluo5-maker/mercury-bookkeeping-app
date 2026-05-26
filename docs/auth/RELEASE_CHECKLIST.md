# Auth Release Checklist

## Supabase

- [ ] Run the auth/workspace SQL migration in the Supabase SQL editor.
- [ ] Verify `profiles`, `workspaces`, and `workspace_members` exist.
- [ ] Verify `workspace_id` exists on transactions, categories, receipts, company_settings, audit_logs, and monthly_closings.
- [ ] Confirm service role grants still work for server API routes.
- [ ] Confirm Supabase Auth email/password provider is enabled.
- [ ] Configure Google provider if `ENABLE_GOOGLE_LOGIN=true`.

## Environment

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Keep `SUPABASE_URL` server-only.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- [ ] Keep `ADMIN_PASSWORD` only as temporary legacy fallback.
- [ ] Set `ALLOW_PUBLIC_SIGNUP` intentionally.
- [ ] Set `ENABLE_GOOGLE_LOGIN`, `ENABLE_GITHUB_LOGIN`, and `ENABLE_MICROSOFT_LOGIN` intentionally.

## OAuth Redirects

- [ ] Supabase Site URL points to production app URL.
- [ ] Supabase redirect allow list includes `/auth/callback` for local and production.
- [ ] Google OAuth client authorized JavaScript origins include local and production origins.
- [ ] Google OAuth authorized redirect URI includes the Supabase Auth callback URL.

## Validation

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm audit --json`
- [ ] Register with email/password.
- [ ] Login with email/password.
- [ ] Logout.
- [ ] Forgot password page loads.
- [ ] Google login button appears only when enabled.
- [ ] New user gets workspace.
- [ ] New user sees no other workspace data.
- [ ] Add transaction writes with workspace scope.
- [ ] Receipt upload UI and protected download still work.
- [ ] Language switching works.
- [ ] Supabase status still works.

## Rollback

- [ ] Keep `ADMIN_PASSWORD` configured during rollout.
- [ ] If Auth rollout fails, disable OAuth flags and use legacy fallback while investigating.
- [ ] Do not remove workspace columns during emergency rollback; leave data in place.
- [ ] Revert application code only after confirming no new account-created data would be orphaned.

## Known Limitations

- Team invitation management is not included in this phase.
- Role permissions beyond membership verification are foundation-level.
- LocalStorage remains browser-local draft/fallback storage.
