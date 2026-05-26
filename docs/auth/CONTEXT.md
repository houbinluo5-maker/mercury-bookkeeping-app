# Auth Context

## Existing App Capabilities

Mercury Books is a Next.js, TypeScript, and Tailwind bookkeeping app for a US LLC ecommerce workflow. It includes dashboard reporting, transaction entry, Mercury CSV import, chart of accounts, receipts, reconciliation, audit trail, monthly closing, monthly/quarterly/annual reports, CPA tax package export, Supabase persistence, Supabase Storage receipt uploads, localStorage fallback, and English/Simplified Chinese language switching.

## Current Authentication

The app currently uses `ADMIN_PASSWORD` with a derived cookie named `mercury_books_auth`. Server APIs call `isAuthenticatedRequest`, which validates only that shared admin cookie. This does not identify the human actor and does not create tenant boundaries.

## Supabase Persistence

Server-side Supabase writes use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `lib/supabase-server.ts`. These keys must remain server-only. Browser code must use only public Auth configuration: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Core Tables

Existing persistence includes:

- `transactions`
- `categories`
- `receipts`
- `company_settings`
- `audit_logs`
- `monthly_closings`

The auth migration adds:

- `profiles`
- `workspaces`
- `workspace_members`

And adds `workspace_id` to existing bookkeeping tables for tenant isolation.

## Receipts

Receipt uploads currently use a private `receipts` Supabase Storage bucket through protected server routes. Auth hardening requires uploads/downloads to verify the logged-in user, active workspace, transaction ownership, and receipt object path. New object paths should use `receipts/{workspace_id}/{transaction_id}/filename`.

## Audit Logs

Audit logs already capture bookkeeping actions. Auth adds actor identity fields where available, including actor user id, actor email, and workspace id, while preserving existing action semantics.

## LocalStorage Fallback

LocalStorage remains a browser-local draft/fallback mode. It is not a tenant-safe shared persistence layer. Imported backup JSON should load into local draft mode unless migrated through safe server APIs.
