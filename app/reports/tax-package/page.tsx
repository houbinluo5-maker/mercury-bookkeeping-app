"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { YearSelect } from "@/components/period-selectors";
import { ReconciliationLink } from "@/components/reconciliation-link";
import { getAvailableYears } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import {
  buildTaxPackageData,
  categorySummaryHeaders,
  downloadCsv,
  downloadTaxPackageWorkbook,
  pnlHeaders,
  receiptIndexHeaders,
  reviewQueueHeaders,
  transactionLedgerHeaders,
  type NeedsReviewFilter,
  type ReceiptStatusFilter,
  type ReconciliationStatusFilter
} from "@/lib/tax-package";

function yearStart(year: number) {
  return `${year}-01-01`;
}

function yearEnd(year: number) {
  return `${year}-12-31`;
}

function filePrefix(year: number, startDate: string, endDate: string) {
  return `${year}-tax-package-${startDate}-to-${endDate}`;
}

export default function TaxPackagePage() {
  const { categories, settings, transactions } = useBookkeeping();
  const { categoryLabel, t } = useI18n();
  const years = useMemo(
    () => Array.from(new Set([...getAvailableYears(transactions), settings.tax_year])).sort((a, b) => b - a),
    [settings.tax_year, transactions]
  );
  const [taxYear, setTaxYear] = useState(settings.tax_year);
  const [startDate, setStartDate] = useState(yearStart(settings.tax_year));
  const [endDate, setEndDate] = useState(yearEnd(settings.tax_year));
  const [category, setCategory] = useState("all");
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatusFilter>("all");
  const [reconciliationStatus, setReconciliationStatus] =
    useState<ReconciliationStatusFilter>("all");
  const [needsReview, setNeedsReview] = useState<NeedsReviewFilter>("all");

  const filters = useMemo(
    () => ({
      category,
      endDate,
      needsReview,
      receiptStatus,
      reconciliationStatus,
      startDate,
      taxYear
    }),
    [category, endDate, needsReview, receiptStatus, reconciliationStatus, startDate, taxYear]
  );
  const taxPackage = useMemo(
    () => buildTaxPackageData(transactions, categories, filters),
    [categories, filters, transactions]
  );
  const prefix = filePrefix(taxYear, startDate, endDate);
  const summaryCards = [
    ["grossRevenue", formatCurrency(taxPackage.summary.grossRevenue, settings.default_currency), "green"],
    [
      "refundsContraRevenue",
      formatCurrency(taxPackage.summary.refundsContraRevenue, settings.default_currency),
      "amber"
    ],
    ["netRevenue", formatCurrency(taxPackage.summary.netRevenue, settings.default_currency), "green"],
    ["cogs", formatCurrency(taxPackage.summary.cogs, settings.default_currency), "amber"],
    ["grossProfit", formatCurrency(taxPackage.summary.grossProfit, settings.default_currency), "blue"],
    [
      "advertisingExpense",
      formatCurrency(taxPackage.summary.advertisingExpense, settings.default_currency),
      "neutral"
    ],
    [
      "shippingFulfillment",
      formatCurrency(taxPackage.summary.shippingFulfillment, settings.default_currency),
      "neutral"
    ],
    [
      "softwareExpense",
      formatCurrency(taxPackage.summary.softwareExpense, settings.default_currency),
      "neutral"
    ],
    [
      "websiteHosting",
      formatCurrency(taxPackage.summary.websiteHosting, settings.default_currency),
      "neutral"
    ],
    ["bankFees", formatCurrency(taxPackage.summary.bankFees, settings.default_currency), "neutral"],
    [
      "paymentProcessingFees",
      formatCurrency(taxPackage.summary.paymentProcessingFees, settings.default_currency),
      "neutral"
    ],
    [
      "otherExpenses",
      formatCurrency(taxPackage.summary.otherExpenses, settings.default_currency),
      "neutral"
    ],
    ["netIncome", formatCurrency(taxPackage.summary.netIncome, settings.default_currency), "blue"],
    [
      "ownerContributions",
      formatCurrency(taxPackage.summary.ownerContributions, settings.default_currency),
      "neutral"
    ],
    ["ownerDraws", formatCurrency(taxPackage.summary.ownerDraws, settings.default_currency), "neutral"],
    [
      "internalTransfersInvestmentTransfers",
      formatCurrency(taxPackage.summary.internalTransfersInvestmentTransfers, settings.default_currency),
      "neutral"
    ],
    ["missingReceiptsCount", String(taxPackage.summary.missingReceiptsCount), taxPackage.summary.missingReceiptsCount ? "red" : "green"],
    ["needsReviewCount", String(taxPackage.summary.needsReviewCount), taxPackage.summary.needsReviewCount ? "amber" : "green"],
    [
      "unreconciledTransactionsCount",
      String(taxPackage.summary.unreconciledTransactionsCount),
      taxPackage.summary.unreconciledTransactionsCount ? "amber" : "green"
    ]
  ] as const;

  function updateTaxYear(year: number) {
    setTaxYear(year);
    setStartDate(yearStart(year));
    setEndDate(yearEnd(year));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => downloadTaxPackageWorkbook(taxPackage, `${prefix}-workbook.xls`)}
            variant="primary"
          >
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
            {t("exportTaxPackageWorkbook")}
          </Button>
        }
        eyebrow={`${settings.entity_type} ${t("taxYear")} ${taxYear}`}
        title={t("taxPackage")}
      />

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-6 text-amber-900">{t("taxPackageWarning")}</p>
        </div>
      </section>

      <ReconciliationLink descriptionKey="reconciliationCenterTaxPackageNotice" />

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <YearSelect onChange={updateTaxYear} value={taxYear} years={years} />
          <label className="space-y-1">
            <span className="form-label">{t("startDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("endDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("category")}</span>
            <select
              className="form-input"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="all">{t("allCategories")}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {categoryLabel(item.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("receiptStatus")}</span>
            <select
              className="form-input"
              onChange={(event) => setReceiptStatus(event.target.value as ReceiptStatusFilter)}
              value={receiptStatus}
            >
              <option value="all">{t("allReceiptStatuses")}</option>
              <option value="missing">{t("receiptMissing")}</option>
              <option value="linked">{t("receiptLinked")}</option>
              <option value="required">{t("receiptRequired")}</option>
              <option value="optional">{t("receiptOptional")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("reconciliationStatus")}</span>
            <select
              className="form-input"
              onChange={(event) =>
                setReconciliationStatus(event.target.value as ReconciliationStatusFilter)
              }
              value={reconciliationStatus}
            >
              <option value="all">{t("allReconciliationStatuses")}</option>
              <option value="reconciled">{t("reconciled")}</option>
              <option value="unreconciled">{t("unreconciled")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("reviewStatus")}</span>
            <select
              className="form-input"
              onChange={(event) => setNeedsReview(event.target.value as NeedsReviewFilter)}
              value={needsReview}
            >
              <option value="all">{t("allReviewStatuses")}</option>
              <option value="yes">{t("needsReviewOnly")}</option>
              <option value="no">{t("noNeedsReview")}</option>
            </select>
          </label>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
            <p className="form-label">{t("filteredTransactions")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {taxPackage.filteredTransactions.length}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([labelKey, value, tone]) => (
          <MetricCard key={labelKey} label={t(labelKey)} tone={tone} value={value} />
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("cpaExportFiles")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("taxPackageExportsHelp")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Button onClick={() => downloadCsv(transactionLedgerHeaders, taxPackage.transactionRows, `${prefix}-ledger.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportFullLedgerCsv")}
          </Button>
          <Button onClick={() => downloadCsv(categorySummaryHeaders, taxPackage.categorySummaryRows, `${prefix}-category-summary.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportCategorySummaryCsv")}
          </Button>
          <Button onClick={() => downloadCsv(pnlHeaders, taxPackage.monthlyPnlRows, `${prefix}-monthly-pnl.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportMonthlyPnlCsv")}
          </Button>
          <Button onClick={() => downloadCsv(pnlHeaders, taxPackage.quarterlyPnlRows, `${prefix}-quarterly-pnl.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportQuarterlyPnlCsv")}
          </Button>
          <Button onClick={() => downloadCsv(reviewQueueHeaders, taxPackage.missingReceiptRows, `${prefix}-missing-receipts.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportMissingReceiptsCsv")}
          </Button>
          <Button onClick={() => downloadCsv(reviewQueueHeaders, taxPackage.needsReviewRows, `${prefix}-needs-review.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportNeedsReviewCsv")}
          </Button>
          <Button onClick={() => downloadCsv(reviewQueueHeaders, taxPackage.ownerActivityRows, `${prefix}-owner-activity.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportOwnerActivityCsv")}
          </Button>
          <Button onClick={() => downloadCsv(reviewQueueHeaders, taxPackage.reconciliationIssueRows, `${prefix}-reconciliation-issues.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportReconciliationIssuesCsv")}
          </Button>
          <Button onClick={() => downloadCsv(receiptIndexHeaders, taxPackage.receiptIndexRows, `${prefix}-receipt-index.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportReceiptIndexCsv")}
          </Button>
        </div>
      </section>
    </div>
  );
}
