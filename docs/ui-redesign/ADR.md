# ADR: SaaS-Grade UI Redesign

## Status
Accepted for phased implementation.

## Decision
Redesign the app through shared primitives and app shell updates before page-specific polish. Keep the business logic untouched and make visual changes incremental.

## Rationale
- A shared design layer gives future operations workflows a coherent foundation.
- Updating primitives such as shell, cards, badges, buttons, forms, filters, and tables improves many pages with limited code risk.
- The app is an operational finance product, so readability and trust matter more than decoration.

## Alternatives Considered
- Full page rewrites: rejected because they create high regression risk across forms, tables, receipts, audit trail, and reports.
- New component library: rejected because the existing Tailwind stack is sufficient and avoids dependency churn.
- Marketing-style redesign: rejected because users need a dense, repeatable bookkeeping workspace.

## Implementation Plan
1. Document product, context, design system, and release checklist.
2. Update shared tokens and primitives.
3. Redesign app shell and navigation groups.
4. Upgrade priority pages through existing components.
5. Smoke test protected workflows and language switching.

## Security Considerations
The redesign must not move service role credentials client-side, bypass admin auth, change protected API routes, or alter audit/receipt/monthly closing persistence behavior.
