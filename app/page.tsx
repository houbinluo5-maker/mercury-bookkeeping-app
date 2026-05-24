"use client";

import Link from "next/link";
import { Download, PlusCircle } from "lucide-react";
import { Button, buttonClassName } from "@/components/button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ReconciliationLink } from "@/components/reconciliation-link";
import { TransactionsTable } from "@/components/transactions-table";
import { filterByYear, getDashboardStats } from "@/lib/calculations";
import { downloadExcel } from "@/lib/export-excel";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function DashboardPage() {
  const { transactions, settings } = useBookkeeping();
  const { t } = useI18n();
  const yearTransactions = filterByYear(transactions, settings.tax_year);
  const stats = getDashboardStats(yearTransactions);
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => downloadExcel(yearTransactions, `${settings.tax_year}-bookkeeping.xls`)}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Button>
            <Link className={buttonClassName("primary")} href="/transactions/new">
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
              {t("add")}
            </Link>
          </>
        }
        eyebrow={`${settings.company_name} - ${settings.tax_year} - ${
          settings.business_type_tax_notes || settings.entity_type
        }`}
        title={t("dashboard")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("revenue")} value={formatCurrency(stats.revenue)} tone="green" />
        <MetricCard
          detail={`${t("grossProfit")} ${formatCurrency(stats.gross_profit)}`}
          label={t("netIncome")}
          tone={stats.net_income >= 0 ? "blue" : "red"}
          value={formatCurrency(stats.net_income)}
        />
        <MetricCard
          detail={`${stats.unreconciled_count} ${t("transactions")}`}
          label={t("needsReconciliation")}
          tone={stats.unreconciled_count ? "amber" : "green"}
          value={formatCurrency(
            yearTransactions
              .filter((transaction) => !transaction.reconciled)
              .reduce((total, transaction) => total + transaction.money_in + transaction.money_out, 0)
          )}
        />
        <MetricCard
          detail={`${stats.receipts_missing_count} / ${stats.receipts_required_count} ${t("required")}`}
          label={t("missingReceipts")}
          tone={stats.receipts_missing_count ? "red" : "green"}
          value={`${stats.receipts_missing_count}`}
        />
      </section>

      <ReconciliationLink descriptionKey="reconciliationCenterDashboardNotice" />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={t("ownerContributions")}
          value={formatCurrency(stats.owner_contributions)}
          tone="green"
        />
        <MetricCard label={t("ownerDraws")} value={formatCurrency(stats.owner_draws)} tone="amber" />
        <MetricCard
          label={t("investmentTransfers")}
          value={formatCurrency(stats.investment_transfers)}
          tone="blue"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-normal text-ink">{t("reportsTransactions")}</h2>
          <Link className="text-sm font-semibold text-marine hover:text-ink" href="/transactions">
            {t("viewAll")}
          </Link>
        </div>
        <TransactionsTable compact transactions={recentTransactions} />
      </section>
    </div>
  );
}
