# UI Redesign Context

## Product Context
Mercury Bookkeeping is a Next.js, TypeScript, Tailwind app for US LLC ecommerce bookkeeping. It supports protected admin access, Supabase persistence, localStorage fallback, receipt uploads, Mercury CSV import, reconciliation, audit history, monthly closing, and CPA/tax package exports.

## Current Capabilities
- `ADMIN_PASSWORD` login with HTTP-only session cookie.
- Supabase database persistence via server routes and service role key.
- Supabase Storage receipt uploads.
- Local backup JSON export/import and localStorage fallback.
- Transactions, chart of accounts, receipts, reconciliation center, audit trail, monthly/quarterly/annual reports, tax package, monthly closing.
- English and Simplified Chinese language switch through `lib/i18n.ts`.

## Design Constraints
- Keep the first screen as the usable app, not a landing page.
- Prioritize scanability, trust, and operational density.
- Avoid single-use styling that makes later operations pages harder to add.
- Keep card radius restrained and visual decoration purposeful.

## Technical Dependencies
- App Router pages in `app/`.
- Shared components in `components/`.
- Tailwind tokens in `tailwind.config.ts` and global component classes in `app/globals.css`.
- Business logic and persistence in `lib/`.

## Risks
- Over-styling tables may reduce bookkeeping scanability.
- Page-by-page one-off classes could create maintenance drift.
- UI changes must not weaken auth, protected routes, receipt upload controls, audit logging, or Supabase server-only key handling.
