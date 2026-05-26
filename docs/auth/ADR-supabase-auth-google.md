# ADR: Supabase Auth with Google OAuth and Workspace Ownership

## Status

Accepted

## Decision

Mercury Books will use Supabase Auth for email/password and OAuth sign-in. Google is the first enabled OAuth provider. GitHub and Microsoft support are implemented as provider-ready code paths but hidden from the UI unless explicitly enabled by environment flags.

The app will store business data inside workspaces. Every authenticated user must have a profile, at least one workspace membership, and an active workspace before using the app.

## Why ADMIN_PASSWORD Is Not Enough

A shared password has no per-user identity, cannot support OAuth, cannot produce trustworthy actor-level audit logs, and cannot isolate data between customers. It remains only as a temporary legacy fallback for private deployments that have not completed account migration.

## Why Supabase Auth

The app already uses Supabase for database persistence and private receipt storage. Supabase Auth keeps identity close to the data platform, supports email/password and OAuth providers, and lets server APIs verify user tokens without exposing service role credentials to the browser.

## Why Workspace Ownership

Bookkeeping data belongs to a business, not only to an individual login. A workspace boundary allows future roles for founders, operators, bookkeepers, and CPAs while ensuring every transaction, receipt, audit log, report, and setting is scoped to a business account.

## OAuth Redirect Configuration

Google OAuth requires Supabase Auth provider setup, a Google OAuth client, authorized JavaScript origins, a Supabase callback URL, and production redirect allow-list entries. Vercel must expose only public Auth env vars to the browser and keep service role env vars server-only.

## Public Signup Control

Public signup is disabled by default after the first owner workspace exists unless `ALLOW_PUBLIC_SIGNUP=true`. This avoids accidental public tenant creation on a private bookkeeping deployment.

## Legacy Data Protection

Existing rows are assigned to a `legacy-workspace` during migration. After login migration, the first owner can review and migrate legacy data into the intended workspace through controlled server flows.

## Consequences

- Server APIs must validate user identity and workspace membership.
- Service role access stays behind server routes only.
- Client code can use public Supabase Auth configuration.
- Audit logs become more trustworthy because actor identity can be attached to changes.
