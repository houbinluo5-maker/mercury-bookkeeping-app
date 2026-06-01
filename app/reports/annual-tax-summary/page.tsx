"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { YearSelect } from "@/components/period-selectors";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { ReportSummary } from "@/components/report-summary";
import { ReportTable } from "@/components/report-table";
import {
  filterByYear,
  getAvailableYears,
  groupByCategory,
  groupByTaxLine,
  summarizeTransactions
} from "@/lib/calculations";
import { downloadExcel } from "@/lib/export-excel";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function AnnualTaxSummaryPage() {
  const { permissions, recordExportAudit, transactions, settings } = useBookkeeping();
  const { t } = useI18n();
  const years = useMemo(() => getAvailableYears(transactions), [transactions]);
  const [year, setYear] = useState(settings.tax_year);
  const reportTransactions = useMemo(() => filterByYear(transactions, year), [transactions, year]);
  const summary = summarizeTransactions(reportTransactions);
  const taxRows = groupByTaxLine(reportTransactions);
  const categoryRows = groupByCategory(reportTransactions);
  const exportFileName = `${year}-boss-finance-annual-tax-summary.xlsx`;

  async function exportAnnualTaxSummary() {
    const allowed = await recordExportAudit({
      entityId: String(year),
      entityType: "transaction",
      exportType: "annual_tax_summary",
      fileFormat: "xlsx",
      fileName: exportFileName,
      reportPeriod: String(year),
      rowCount: reportTransactions.length,
      sheetCount: 9,
      workbookType: "boss_finance_workbook"
    });

    if (!allowed) return;

    downloadExcel(reportTransactions, exportFileName, {
      reportPeriod: String(year),
      title: `罗厚彬记账表 - ${year} 年度税务汇总`
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setYear} value={year} years={years} />
            {permissions.canExportReports ? (
              <Button onClick={() => void exportAnnualTaxSummary()}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("export")}
              </Button>
            ) : null}
          </>
        }
        eyebrow={`${settings.entity_type} ${t("taxYear")} ${year}`}
        title={t("annualTaxSummary")}
      />
      {!permissions.canExportReports ? (
        <PermissionNotice detailKey="askOwnerForExportAccess" titleKey="exportRestrictedForRole" />
      ) : null}
      <ReportSummary summary={summary} />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {t("ordinaryBusinessIncome")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(summary.net_income)}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {t("ownerContributions")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(summary.owner_contributions)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {t("ownerDraws")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(summary.owner_draws)}</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">{t("taxLines")}</h2>
        <ReportTable rows={taxRows} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">{t("categories")}</h2>
        <ReportTable rows={categoryRows} />
      </section>
    </div>
  );
}
