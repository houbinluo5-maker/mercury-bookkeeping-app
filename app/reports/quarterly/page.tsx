"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { QuarterSelect, YearSelect } from "@/components/period-selectors";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { ReportSummary } from "@/components/report-summary";
import { ReportTable } from "@/components/report-table";
import { TransactionsTable } from "@/components/transactions-table";
import {
  filterByQuarter,
  getAvailableYears,
  getTransactionQuarter,
  getTransactionYear,
  groupByCategory,
  summarizeTransactions
} from "@/lib/calculations";
import { downloadExcel } from "@/lib/export-excel";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

function latestPeriod(transactions: ReturnType<typeof useBookkeeping>["transactions"]) {
  const latest = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    year: latest ? getTransactionYear(latest) : new Date().getFullYear(),
    quarter: latest ? getTransactionQuarter(latest) : Math.ceil((new Date().getMonth() + 1) / 3)
  };
}

export default function QuarterlyReportPage() {
  const { permissions, recordExportAudit, transactions } = useBookkeeping();
  const { t } = useI18n();
  const initial = latestPeriod(transactions);
  const [year, setYear] = useState(initial.year);
  const [quarter, setQuarter] = useState(initial.quarter);
  const years = useMemo(() => getAvailableYears(transactions), [transactions]);
  const reportTransactions = useMemo(
    () => filterByQuarter(transactions, year, quarter),
    [quarter, transactions, year]
  );
  const summary = summarizeTransactions(reportTransactions);
  const rows = groupByCategory(reportTransactions);
  const reportPeriod = `${year}-Q${quarter}`;
  const exportFileName = `${year}-q${quarter}-report.xlsx`;

  async function exportQuarterlyReport() {
    const allowed = await recordExportAudit({
      entityId: reportPeriod,
      entityType: "transaction",
      exportType: "quarterly_report",
      fileFormat: "xlsx",
      fileName: exportFileName,
      reportPeriod,
      rowCount: reportTransactions.length
    });

    if (!allowed) return;

    downloadExcel(reportTransactions, exportFileName, {
      reportPeriod,
      title: `罗厚彬记账表 - ${reportPeriod} 季度报告`
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setYear} value={year} years={years} />
            <QuarterSelect onChange={setQuarter} value={quarter} />
            {permissions.canExportReports ? (
              <Button onClick={() => void exportQuarterlyReport()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("export")}
              </Button>
            ) : null}
          </>
        }
        eyebrow={`Q${quarter} ${year}`}
        title={t("quarterlyReport")}
      />
      {!permissions.canExportReports ? (
        <PermissionNotice detailKey="askOwnerForExportAccess" titleKey="exportRestrictedForRole" />
      ) : null}
      <ReportSummary summary={summary} />
      <ReportTable rows={rows} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">{t("reportsTransactions")}</h2>
        <TransactionsTable compact transactions={reportTransactions} />
      </section>
    </div>
  );
}
