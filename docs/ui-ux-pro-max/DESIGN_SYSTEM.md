# UI/UX Pro Max Design System

## Component Inventory
- `AppShell`: finance SaaS frame, grouped navigation, company/tax-year context.
- `PageHeader`: eyebrow, title, subtitle, actions, optional status.
- `SectionHeader`: panel title/subtitle/actions.
- `MetricCard`: KPI module.
- `HealthScoreCard`: focused score/progress/issue summary.
- `StatusBadge`: semantic status chip.
- `AlertBanner`: professional notice/warning/info panel.
- `FilterBar`: grouped filters and search controls.
- `DataTableShell`: framed table surface with optional title/action context.
- `ActionPanel`: command/action grouping.
- `ExportPanel`: export deliverable grouping.
- `EmptyState`: professional no-data state.
- `CommandCard`: quick-action module.
- `ReviewQueueCard`: review item summary.
- `PageToolbar`: top-level action cluster.
- `SoftDivider`: low-noise separation.

## Layout Rules
- Page headers establish business context before controls.
- Command and export panels sit beside or above dense data.
- Tables are framed in `DataTableShell`.
- Warnings and disclaimers use `AlertBanner`.
- Do not nest heavy cards inside heavy cards; nested panels should use low shadows.

## Typography
- Page titles: strong, but not oversized.
- KPI values: large and tabular.
- Labels: small, uppercase, muted.
- Tables: compact, professional, hoverable.

## Components Added In V2
The V2 implementation should add a small set of generic primitives in `components/ui-primitives.tsx` instead of scattering one-off layout classes.
