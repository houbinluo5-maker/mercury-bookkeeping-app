# Mercury Bookkeeping Design System

## Direction
Premium B2B finance operations SaaS: calm, structured, trustworthy, and data-forward.

## Visual Principles
- Clarity first: financial data must be easy to scan and compare.
- Trust through restraint: use color for meaning, not decoration.
- Operational density: keep workflows efficient without making pages feel cramped.
- Modular growth: every surface should support future review queues, assistant panels, ledger views, and close workflows.

## Palette
- Primary: deep marine blue for navigation, primary actions, and active states.
- Accent: emerald for healthy financial state and completion.
- Warning: amber for unresolved review needs.
- Danger: red/coral for destructive actions and missing required support.
- Neutrals: off-white page background, white panels, cool gray borders, slate text.

## Typography
- Use the existing sans stack for compatibility.
- Improve hierarchy through weight, size, spacing, and muted labels rather than adding a font dependency.
- Data values should use tabular numbers where possible.

## Layout
- App shell: persistent grouped sidebar on desktop, horizontal nav on smaller screens.
- Page width: retain `max-w-7xl` for operational pages.
- Cards: 8px radius, subtle border, low shadow, clear headers.
- Tables: sticky-feeling header style, improved row hover, clearer density.
- Filter bars: grouped, bordered, and visually separated from tables.

## Components
- `AppShell`: grouped navigation and commercial product framing.
- `PageHeader`: eyebrow/title/actions plus optional supporting description.
- `MetricCard`: KPI modules with stronger hierarchy and semantic tone.
- `Badge`: status chips with clearer borders and type.
- `Button`: primary/secondary/danger hierarchy with polished focus/hover states.
- Global form/table classes: consistent controls, table cells, and empty states.

## Rollout Plan
Phase 1 updates shared tokens, shell, and components.
Phase 2 updates Dashboard, Transactions, Receipts, Reconciliation Center, Tax Package, and Settings.
Phase 3 brings remaining pages into the same section/header/card patterns.
