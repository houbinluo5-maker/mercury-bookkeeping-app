"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { MonthSelect, YearSelect } from "@/components/period-selectors";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { ReportSummary } from "@/components/report-summary";
import { ReportTable } from "@/components/report-table";
import { TransactionsTable } from "@/components/transactions-table";
import {
  filterByMonth,
  getAvailableYears,
  getTransactionMonth,
  getTransactionYear,
  groupByCategory,
  summarizeTransactions
} from "@/lib/calculations";
import { downloadExcel } from "@/lib/export-excel";
import { useI18n } from "@/lib/i18n";
import { monthlyClosingId, closingStatusTone } from "@/lib/monthly-closing";
import { useBookkeeping } from "@/lib/storage";

function latestPeriod(transactions: ReturnType<typeof useBookkeeping>["transactions"]) {
  const latest = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    year: latest ? getTransactionYear(latest) : new Date().getFullYear(),
    month: latest ? getTransactionMonth(latest) : new Date().getMonth() + 1
  };
}

export default function MonthlyReportPage() {
  const { monthlyClosings, permissions, recordExportAudit, transactions } = useBookkeeping();
  const { monthLabel, t } = useI18n();
  const initial = latestPeriod(transactions);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const years = useMemo(() => getAvailableYears(transactions), [transactions]);
  const reportTransactions = useMemo(
    () => filterByMonth(transactions, year, month),
    [month, transactions, year]
  );
  const summary = summarizeTransactions(reportTransactions);
  const rows = groupByCategory(reportTransactions);
  const closing = monthlyClosings.find((item) => item.id === monthlyClosingId(year, month));
  const reportPeriod = `${year}-${String(month).padStart(2, "0")}`;
  const exportFileName = `${year}-${month}-monthly-report.xlsx`;

  async function exportMonthlyReport() {
    const allowed = await recordExportAudit({
      entityId: reportPeriod,
      entityType: "transaction",
      exportType: "monthly_report",
      fileFormat: "xlsx",
      fileName: exportFileName,
      reportPeriod,
      rowCount: reportTransactions.length
    });

    if (!allowed) return;

    downloadExcel(reportTransactions, exportFileName, {
      reportPeriod,
      title: `罗厚彬记账表 - ${reportPeriod} 月度报告`
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setYear} value={year} years={years} />
            <MonthSelect onChange={setMonth} value={month} />
            {permissions.canExportReports ? (
              <Button onClick={() => void exportMonthlyReport()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("export")}
              </Button>
            ) : null}
          </>
        }
        eyebrow={`${monthLabel(month - 1)} ${year}`}
        title={t("monthlyReport")}
      />
      {!permissions.canExportReports ? (
        <PermissionNotice detailKey="askOwnerForExportAccess" titleKey="exportRestrictedForRole" />
      ) : null}
      <ReportSummary summary={summary} />
      {closing ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={closingStatusTone(closing.status)}>
              {closing.status === "closed"
                ? t("closedStatus")
                : closing.status === "reopened"
                  ? t("reopenedStatus")
                  : closing.status === "ready_to_close"
                    ? t("readyToCloseStatus")
                    : t("openStatus")}
            </Badge>
            {closing.status === "reopened" ? (
              <p className="text-sm text-amber-800">{t("periodIncludesReopenedMonths")}</p>
            ) : null}
          </div>
        </section>
      ) : null}
      <ReportTable rows={rows} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">{t("reportsTransactions")}</h2>
        <TransactionsTable compact transactions={reportTransactions} />
      </section>
    </div>
  );
}
