import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/format";
import type { PeriodSummary } from "@/lib/types";

export function ReportSummary({ summary }: { summary: PeriodSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue" value={formatCurrency(summary.revenue)} tone="green" />
      <MetricCard label="COGS" value={formatCurrency(summary.cogs)} tone="amber" />
      <MetricCard label="Expenses" value={formatCurrency(summary.expenses)} tone="red" />
      <MetricCard
        label="Net Income"
        value={formatCurrency(summary.net_income)}
        tone={summary.net_income >= 0 ? "blue" : "red"}
      />
    </div>
  );
}
