"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { YearSelect } from "@/components/period-selectors";
import { PageHeader } from "@/components/page-header";
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
import { useBookkeeping } from "@/lib/storage";

export default function AnnualTaxSummaryPage() {
  const { transactions, settings } = useBookkeeping();
  const years = useMemo(() => getAvailableYears(transactions), [transactions]);
  const [year, setYear] = useState(settings.tax_year);
  const reportTransactions = useMemo(() => filterByYear(transactions, year), [transactions, year]);
  const summary = summarizeTransactions(reportTransactions);
  const taxRows = groupByTaxLine(reportTransactions);
  const categoryRows = groupByCategory(reportTransactions);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setYear} value={year} years={years} />
            <Button onClick={() => downloadExcel(reportTransactions, `${year}-annual-tax-summary.xls`)}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Export
            </Button>
          </>
        }
        eyebrow={`${settings.entity_type} tax year ${year}`}
        title="Annual Tax Summary"
      />
      <ReportSummary summary={summary} />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Ordinary Business Income
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(summary.net_income)}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Member Contributions
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(summary.owner_contributions)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Member Distributions
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(summary.owner_draws)}</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">Tax Lines</h2>
        <ReportTable rows={taxRows} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">Categories</h2>
        <ReportTable rows={categoryRows} />
      </section>
    </div>
  );
}
