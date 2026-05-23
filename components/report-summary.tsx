"use client";

import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { PeriodSummary } from "@/lib/types";

export function ReportSummary({ summary }: { summary: PeriodSummary }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t("revenue")} value={formatCurrency(summary.revenue)} tone="green" />
      <MetricCard label={t("cogs")} value={formatCurrency(summary.cogs)} tone="amber" />
      <MetricCard label={t("expenses")} value={formatCurrency(summary.expenses)} tone="red" />
      <MetricCard
        label={t("netIncome")}
        value={formatCurrency(summary.net_income)}
        tone={summary.net_income >= 0 ? "blue" : "red"}
      />
    </div>
  );
}
