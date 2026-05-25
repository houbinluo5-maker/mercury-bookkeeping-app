# Mercury Bookkeeping UI Redesign PRD

## Problem
Mercury Bookkeeping is functionally strong, but the current interface reads as an internal tool. Business owners, operators, bookkeepers, and CPAs need a calmer, more polished product surface before more advanced finance operations workflows are added.

## Goals
- Make the app feel commercial, trustworthy, and SaaS-grade without reducing data density.
- Improve hierarchy across dashboard, transaction review, receipts, reconciliation, tax package, and settings.
- Establish reusable visual primitives for future operations features such as review queues, assistant panels, ledger views, and bookkeeping health.
- Preserve ADMIN_PASSWORD auth, Supabase persistence, receipt uploads, audit trail, monthly closing, reports, and language switching.

## Non-Goals
- No changes to bookkeeping calculations, Supabase credentials, authentication policy, or audit behavior.
- No marketing landing page.
- No dark mode, theming UI, or decorative visual overhaul beyond the shared app system.
- No new advanced operations workflows in this phase.

## Users
- LLC owner/operator reviewing cash flow, receipts, and CPA handoff readiness.
- Bookkeeper performing transaction cleanup and reconciliation.
- CPA reviewing export packages and audit trail context.

## Page Inventory
- Core: Dashboard, Add Transaction, Transactions, Import Mercury CSV.
- Finance Ops: Reconciliation Center, Receipts, Monthly Closing, Audit Trail.
- Reports: Monthly Report, Quarterly Report, Annual Tax Summary, Tax Package.
- Setup: Chart of Accounts, Settings.

## Component Inventory
- Shell/navigation: `AppShell`, `PageHeader`.
- Controls: `Button`, `Badge`, form classes, period selectors.
- Data display: `MetricCard`, `TransactionsTable`, `ReceiptTable`, `ReportTable`, `ReportSummary`.
- Workflows: `TransactionForm`, `TransactionEditModal`, `ReceiptUploadControl`, `AuditHistoryPanel`, `ReconciliationLink`.

## Before / After Goals
- Before: flat pages, simple cards, plain sidebar, uneven hierarchy.
- After: grouped navigation, premium operational shell, stronger cards/KPIs, polished tables, clearer filters, better notices, more intentional page sections.

## Acceptance Criteria
- Sidebar groups navigation into Core, Finance Ops, Reports, and Setup.
- Shared cards, badges, buttons, inputs, tables, and notices look consistent.
- Dashboard feels like a business overview with strong KPI and health modules.
- Transactions, receipts, reconciliation, tax package, and settings use clearer sectioning and controls.
- English and Simplified Chinese still show one language at a time.
- Auth, Supabase, receipt uploads, audit trail, reports, and monthly closing continue to work.

## Test Plan
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- Browser smoke tests: login, dashboard, transactions, receipts, reconciliation center, settings, tax package, language switching.

## Disclaimer
This redesign improves bookkeeping organization and review workflows. It does not make the app tax, legal, accounting, or financial advice.
