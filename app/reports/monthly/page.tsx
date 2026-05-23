"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { MonthSelect, YearSelect } from "@/components/period-selectors";
import { PageHeader } from "@/components/page-header";
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
import { monthName } from "@/lib/format";
import { useBookkeeping } from "@/lib/storage";

function latestPeriod(transactions: ReturnType<typeof useBookkeeping>["transactions"]) {
  const latest = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    year: latest ? getTransactionYear(latest) : new Date().getFullYear(),
    month: latest ? getTransactionMonth(latest) : new Date().getMonth() + 1
  };
}

export default function MonthlyReportPage() {
  const { transactions } = useBookkeeping();
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

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setYear} value={year} years={years} />
            <MonthSelect onChange={setMonth} value={month} />
            <Button onClick={() => downloadExcel(reportTransactions, `${year}-${month}-monthly-report.xls`)}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Export
            </Button>
          </>
        }
        eyebrow={`${monthName(month - 1)} ${year}`}
        title="Monthly Report"
      />
      <ReportSummary summary={summary} />
      <ReportTable rows={rows} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">Transactions</h2>
        <TransactionsTable compact transactions={reportTransactions} />
      </section>
    </div>
  );
}
