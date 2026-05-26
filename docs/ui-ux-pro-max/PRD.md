# UI/UX Pro Max PRD

## What Was Wrong With The Previous UI
The previous redesign improved consistency, but it still felt like a tidy admin interface. It did not yet signal a premium commercial finance product: the sidebar lacked product framing, the dashboard did not feel like a command center, page sections were too generic, and critical bookkeeping workflows did not have enough hierarchy or executive context.

## New Product Positioning
Mercury Bookkeeping should feel like an Executive Finance OS for US LLC ecommerce operators: a finance operations command center, founder bookkeeping dashboard, CPA-ready accounting workspace, and back-office control plane.

## Goals
- Make priority pages feel like a sellable B2B SaaS product.
- Improve navigation, page hierarchy, KPI storytelling, review queues, action placement, and export presentation.
- Add reusable primitives for command cards, action panels, filter bars, data shells, alert banners, and page toolbars.
- Keep every change UI-only unless a tiny supporting display helper is required.

## Non-Goals
- No bookkeeping logic changes.
- No Supabase logic, credentials, or schema changes.
- No auth, receipt upload, audit trail, monthly closing, reconciliation, or tax package calculation changes.
- No removal of existing pages or language switching.

## Acceptance Criteria
- The sidebar reads as a finance SaaS workspace, not an admin menu.
- Dashboard includes executive KPIs, health panel, quick actions, CPA readiness, and recent activity.
- Transactions reads as a ledger workspace with a stronger toolbar and data shell.
- Receipts reads as document control with summary and missing receipt queue clarity.
- Reconciliation Center reads as the primary finance operations command center.
- Tax Package reads as a polished CPA deliverable page.
- Settings separates safe status, profile, backup, and maintenance areas.
- English and Simplified Chinese remain single-language displays.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- Browser/route smoke checks for login and priority pages.
