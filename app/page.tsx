"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, PlusCircle, ReceiptText, Upload, Wand2 } from "lucide-react";
import { Button, buttonClassName } from "@/components/button";
import { Badge } from "@/components/badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { ReconciliationLink } from "@/components/reconciliation-link";
import { TransactionsTable } from "@/components/transactions-table";
import { AlertBanner, CommandCard, QuickActionCard, SectionCard, SectionHeader } from "@/components/ui-primitives";
import { filterByYear, getDashboardStats } from "@/lib/calculations";
import { downloadExcel } from "@/lib/export-excel";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function DashboardPage() {
  const { monthlyClosings, permissions, recordExportAudit, transactions, settings } = useBookkeeping();
  const { language, t } = useI18n();
  const yearTransactions = filterByYear(transactions, settings.tax_year);
  const stats = getDashboardStats(yearTransactions);
  const recentTransactions = transactions.slice(0, 6);
  const yearClosings = monthlyClosings.filter((closing) => closing.year === settings.tax_year);
  const reopenedCount = yearClosings.filter((closing) => closing.status === "reopened").length;
  const closedCount = yearClosings.filter((closing) => closing.status === "closed").length;
  const expenses = yearTransactions.reduce((total, transaction) => total + transaction.money_out, 0);
  const needsReviewCount = yearTransactions.filter((transaction) =>
    [transaction.category, transaction.tax_line, transaction.notes].some((value) =>
      value.toLowerCase().includes("needs review")
    )
  ).length;
  const closeReadiness = Math.max(
    0,
    100 -
    stats.unreconciled_count * 8 -
      stats.receipts_missing_count * 10 -
      needsReviewCount * 6 -
      reopenedCount * 12
  );
  const unresolvedItems = stats.unreconciled_count + stats.receipts_missing_count + needsReviewCount + reopenedCount;
  const dashboardExportFileName = `${settings.tax_year}-bookkeeping.xlsx`;

  async function exportDashboardReport() {
    const allowed = await recordExportAudit({
      entityId: String(settings.tax_year),
      entityType: "transaction",
      exportType: "dashboard_report",
      fileFormat: "xlsx",
      fileName: dashboardExportFileName,
      reportPeriod: String(settings.tax_year),
      rowCount: yearTransactions.length
    });

    if (!allowed) return;

    downloadExcel(yearTransactions, dashboardExportFileName, {
      reportPeriod: String(settings.tax_year),
      title: "罗厚彬记账表 - 年度经营看板"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {permissions.canExportReports ? (
              <Button onClick={() => void exportDashboardReport()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("export")}
              </Button>
            ) : null}
            {permissions.canEditTransactions ? (
              <Link className={buttonClassName("primary")} href="/transactions/new">
                <PlusCircle aria-hidden="true" className="h-4 w-4" />
                {t("add")}
              </Link>
            ) : null}
          </>
        }
        eyebrow={t("executiveFinanceOs")}
        description={t("dashboardSaasDescription")}
        title={t("dashboard")}
      />

      {!permissions.canExportReports ? (
        <PermissionNotice detailKey="askOwnerForExportAccess" titleKey="exportRestrictedForRole" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("revenue")} value={formatCurrency(stats.revenue)} tone="green" />
        <MetricCard
          detail={`${t("grossProfit")} ${formatCurrency(stats.gross_profit)}`}
          label={t("netIncome")}
          tone={stats.net_income >= 0 ? "blue" : "red"}
          value={formatCurrency(stats.net_income)}
        />
        <MetricCard label={t("expenses")} value={formatCurrency(expenses)} tone="amber" />
        <MetricCard
          detail={`${closedCount} ${t("closedStatus")} / ${reopenedCount} ${t("reopenedStatus")}`}
          label={t("monthCloseReadiness")}
          tone={closeReadiness >= 80 ? "green" : closeReadiness >= 55 ? "amber" : "red"}
          value={`${closeReadiness}%`}
        />
      </section>

      {unresolvedItems ? (
        <AlertBanner tone={closeReadiness >= 70 ? "warning" : "danger"}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-ink">
                {language === "zh" ? `月结前还有 ${unresolvedItems} 个未解决事项` : `${unresolvedItems} unresolved items before month close`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {language === "zh"
                  ? "缺失收据、未核对交易、复核标记和重新打开的月份正在等待财务复核。"
                  : "Missing receipts, unreconciled transactions, review flags, and reopened months are waiting for finance review."}
              </p>
            </div>
            <Link className={buttonClassName()} href="/reconciliation">
              {t("openReconciliationCenter")}
            </Link>
          </div>
        </AlertBanner>
      ) : (
        <ReconciliationLink descriptionKey="reconciliationCenterDashboardNotice" />
      )}

      {!permissions.canEditTransactions ? <PermissionNotice /> : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-panel p-5">
          <SectionHeader description={t("bookkeepingHealthHelp")} title={t("financeHealthPanel")} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              [t("missingReceipts"), stats.receipts_missing_count, stats.receipts_missing_count ? "red" : "green"],
              [t("needsReview"), needsReviewCount, needsReviewCount ? "amber" : "green"],
              [t("unreconciled"), stats.unreconciled_count, stats.unreconciled_count ? "amber" : "green"],
              [t("closedStatus"), closedCount, closedCount ? "green" : "neutral"]
            ].map(([label, value, tone]) => (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3" key={String(label)}>
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-2xl font-semibold text-ink tabular-nums">{value}</p>
                  <Badge tone={tone as "neutral" | "green" | "amber" | "red" | "blue"}>
                    {Number(value) ? t("actionNeeded") : t("ready")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SectionCard className="space-y-4">
          <SectionHeader description={t("quickActionsHelp")} title={t("quickActions")} />
          <div className="grid gap-3">
            {permissions.canEditTransactions ? (
              <QuickActionCard
                description={language === "zh" ? "用规则辅助分类记录单笔账务事件。" : "Capture a one-off ledger event with rules-assisted categorization."}
                icon={<PlusCircle aria-hidden="true" className="h-5 w-5" />}
                title={t("addTransaction")}
              >
                <Link className={buttonClassName("primary", "w-full justify-start")} href="/transactions/new">
                  {t("addTransaction")}
                </Link>
              </QuickActionCard>
            ) : null}
            {permissions.canEditTransactions ? (
              <QuickActionCard
                description={language === "zh" ? "将 Mercury CSV 活动导入运营账本。" : "Bring Mercury CSV activity into the operating ledger."}
                icon={<Upload aria-hidden="true" className="h-5 w-5" />}
                title={t("importMercuryCsv")}
              >
                <Link className={buttonClassName("secondary", "w-full justify-start")} href="/imports/mercury">
                  {t("importMercuryCsv")}
                </Link>
              </QuickActionCard>
            ) : null}
            {permissions.canUploadReceipts ? (
              <QuickActionCard
                description={language === "zh" ? "为支出附上凭证，保持 CPA 交接清晰。" : "Attach proof for expenses and keep CPA handoff clean."}
                icon={<ReceiptText aria-hidden="true" className="h-5 w-5" />}
                title={t("uploadReceipt")}
              >
                <Link className={buttonClassName("secondary", "w-full justify-start")} href="/receipts">
                  {t("uploadReceipt")}
                </Link>
              </QuickActionCard>
            ) : null}
            <QuickActionCard
              description={language === "zh" ? "处理收据、分类、重复项和核对异常。" : "Resolve receipts, categories, duplicates, and reconciliation exceptions."}
              icon={<Wand2 aria-hidden="true" className="h-5 w-5" />}
              title={t("openReconciliationCenter")}
            >
              <Link className={buttonClassName("secondary", "w-full justify-start")} href="/reconciliation">
                {t("openReconciliationCenter")}
              </Link>
            </QuickActionCard>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CommandCard
          action={
            <Link className="text-sm font-semibold text-marine hover:text-ink" href="/reports/tax-package">
              {t("taxPackage")}
            </Link>
          }
          description={t("cpaReadinessHelp")}
          icon={<FileSpreadsheet aria-hidden="true" className="h-5 w-5" />}
          title={t("cpaReadiness")}
        />
        <CommandCard
          description={`${stats.receipts_missing_count} ${t("missingReceipts")} / ${needsReviewCount} ${t("needsReview")}`}
          icon={<ReceiptText aria-hidden="true" className="h-5 w-5" />}
          title={t("reviewQueue")}
        />
        <CommandCard
          description={`${closedCount} ${t("closedStatus")} / ${reopenedCount} ${t("reopenedStatus")}`}
          icon={<Wand2 aria-hidden="true" className="h-5 w-5" />}
          title={t("monthCloseReadiness")}
        />
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="section-title">{t("bookkeepingHealth")}</h2>
            <p className="section-subtitle">{t("bookkeepingHealthHelp")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={closedCount ? "green" : "neutral"}>{t("closedStatus")}: {closedCount}</Badge>
            <Badge tone={reopenedCount ? "amber" : "green"}>{t("reopenedStatus")}: {reopenedCount}</Badge>
          </div>
        </div>
        {reopenedCount ? (
          <p className="mt-3 text-sm text-amber-800">{t("periodIncludesReopenedMonths")}</p>
        ) : null}
      </section>

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
          <div>
            <h2 className="section-title">{t("reportsTransactions")}</h2>
            <p className="section-subtitle">{t("recentTransactionsHelp")}</p>
          </div>
          <Link className="text-sm font-semibold text-marine hover:text-ink" href="/transactions">
            {t("viewAll")}
          </Link>
        </div>
        <TransactionsTable compact transactions={recentTransactions} />
      </section>
    </div>
  );
}
