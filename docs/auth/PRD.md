# Supabase Auth and Workspace Accounts PRD

## Problem

Mercury Books currently protects the application with a single `ADMIN_PASSWORD`. That is acceptable for a private prototype, but it is not enough for a commercial bookkeeping SaaS because every user shares the same credential, there is no identity-level auditability, and there is no workspace boundary between businesses.

The product needs real accounts, OAuth login, and workspace-scoped data access so founders, operators, bookkeepers, and CPAs can trust that bookkeeping data is private and attributable.

## Goals

- Replace the primary login experience with Supabase Auth email/password accounts.
- Add Google login for commercial SaaS onboarding.
- Add provider-ready GitHub and Microsoft structure, hidden unless configured.
- Keep `ADMIN_PASSWORD` as temporary legacy fallback only.
- Create a profile, workspace, and workspace membership for each new owner.
- Scope server APIs by authenticated user and workspace membership.
- Keep Supabase service role credentials server-only.
- Preserve existing bookkeeping, receipts, reconciliation, audit trail, monthly closing, tax package, and language switching.

## Non-Goals

- No fake books, hidden ledgers, or tax evasion workflows.
- No changes to bookkeeping calculations.
- No uncontrolled public multi-user collaboration beyond workspace membership foundations.
- No client-side use of the Supabase service role key.
- No removal of legacy localStorage fallback in this phase.

## User Flows

### Register with Email and Password

1. User opens `/register`.
2. User enters full name, email, password, password confirmation, and workspace name.
3. If public signup is allowed, or no owner workspace exists yet, the app creates a Supabase Auth user.
4. Server ensures `profiles`, `workspaces`, and `workspace_members` rows exist.
5. User is redirected to the dashboard.

### Login with Email and Password

1. User opens `/login`.
2. User enters email and password.
3. Server exchanges credentials with Supabase Auth.
4. Server sets secure HTTP-only session cookies.
5. Server APIs use the access token to verify identity and workspace membership.

### Continue with Google

1. User clicks Continue with Google.
2. Browser goes to Supabase OAuth authorization.
3. Supabase redirects to `/auth/callback`.
4. Callback receives tokens, stores them through a server endpoint, ensures profile/workspace, then redirects to dashboard.

### Forgot and Reset Password

1. User requests reset from `/forgot-password`.
2. Supabase sends the reset email using configured Auth email templates.
3. User lands on `/reset-password` and updates the password through Supabase Auth.

### Legacy Admin Fallback

1. If a deployment still has only `ADMIN_PASSWORD`, the login page exposes a secondary legacy access panel.
2. Legacy access is labeled temporary and does not become the primary product path.

## Data Model

- `profiles`: one row per Supabase Auth user.
- `workspaces`: one business/accounting workspace owned by a user.
- `workspace_members`: membership and role mapping.
- Existing data tables gain `workspace_id` for tenant scoping.

Initial roles are `owner`, `admin`, `bookkeeper`, and `viewer`. This phase creates owner workspaces; future invite flows can add other roles.

## Edge Cases

- Signup disabled after first owner: show "Registration is currently invite-only."
- OAuth user without profile: create profile/workspace during callback.
- User with no workspace: redirect to onboarding.
- Missing Supabase Auth env vars: keep legacy fallback if configured and show a clear error for account login.
- Existing legacy rows: migration assigns them to a `legacy-workspace`.
- Monthly closing not installed: auth health can still pass if the table is absent in older deployments.

## Acceptance Criteria

- Email/password registration and login work through Supabase Auth.
- Google login button is visible only when enabled and routes through Supabase OAuth.
- GitHub and Microsoft provider code paths exist but buttons are hidden unless enabled.
- Service role key is never sent to browser code.
- Protected pages redirect unauthenticated users to `/login`.
- Server API requests verify Supabase user identity or temporary legacy fallback.
- New users get a profile, workspace, and owner membership.
- Data access is scoped by active workspace where Supabase persistence is used.
- Sidebar shows workspace/user context and logout.
- Language switch remains functional and auth screens do not mix English and Chinese.

## Test Plan

- Register with email/password.
- Login with email/password.
- Logout.
- Open forgot password and reset password pages.
- Verify Google button appears only with `ENABLE_GOOGLE_LOGIN=true`.
- Verify `/auth/callback` stores OAuth tokens.
- Verify first-time users get a workspace.
- Verify new users see an empty workspace.
- Verify transactions and receipts continue to work with workspace-scoped server APIs.
- Verify public signup disabled copy.
- Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit --json`.

## CPA / Bookkeeping Disclaimer

Mercury Books organizes bookkeeping records and supports CPA review. It does not provide tax, legal, accounting, or financial advice. Users should review reports and audit trails with a qualified professional before filing or making tax decisions.
