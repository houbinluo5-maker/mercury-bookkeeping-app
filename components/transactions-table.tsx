"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Edit3, PlusCircle, Search } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button, buttonClassName } from "@/components/button";
import { PermissionNotice } from "@/components/permission-notice";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { DataTableShell, EmptyState, FilterBar } from "@/components/ui-primitives";
import { downloadExcel } from "@/lib/export-excel";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { isDateInClosedPeriod } from "@/lib/monthly-closing";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction } from "@/lib/types";

export function TransactionsTable({
  transactions,
  compact = false
}: {
  transactions: Transaction[];
  compact?: boolean;
}) {
  const { categories, monthlyClosings, permissions } = useBookkeeping();
  const { categoryLabel, t, taxLineLabel } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const categoryMatch = category === "All" || transaction.category === category;
      const statusMatch =
        status === "All" ||
        (status === "receiptMissing" && transaction.receipt_required && !transaction.receipt_link) ||
        (status === "needsReconciliation" && !transaction.reconciled) ||
        (status === "reconciled" && transaction.reconciled);
      const queryMatch =
        !normalized ||
        [
          transaction.date,
          transaction.account,
          transaction.source,
          transaction.vendor,
          transaction.description,
          transaction.category,
          transaction.tax_line,
          transaction.notes
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return categoryMatch && statusMatch && queryMatch;
    });
  }, [category, query, status, transactions]);

  const editingTransaction =
    transactions.find((transaction) => transaction.id === editingTransactionId) ?? null;

  function StatusBadges({ transaction }: { transaction: Transaction }) {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge tone={transaction.reconciled ? "green" : "amber"}>
          {transaction.reconciled ? t("reconciled") : t("needsReconciliation")}
        </Badge>
        {transaction.receipt_required ? (
          <Badge tone={transaction.receipt_link ? "green" : "red"}>
            {transaction.receipt_link ? t("receiptLinked") : t("receiptMissing")}
          </Badge>
        ) : (
          <Badge tone="neutral">{t("receiptOptional")}</Badge>
        )}
        {isDateInClosedPeriod(monthlyClosings, transaction.date) ? (
          <Badge tone="red">{t("closedPeriod")}</Badge>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <FilterBar>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-[18rem_16rem_14rem]">
            <label className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="form-input pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchTransactions")}
                value={query}
              />
            </label>
            <select
              className="form-input"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="All">{t("allCategories")}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {categoryLabel(item.name)}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="All">{t("allStatuses")}</option>
              <option value="receiptMissing">{t("receiptMissing")}</option>
              <option value="needsReconciliation">{t("needsReconciliation")}</option>
              <option value="reconciled">{t("reconciled")}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadExcel(filtered, "bookkeeping-transactions.xls")}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Button>
            {permissions.canEditTransactions ? (
              <Link className={buttonClassName("primary")} href="/transactions/new">
                <PlusCircle aria-hidden="true" className="h-4 w-4" />
                {t("add")}
              </Link>
            ) : null}
          </div>
        </div>
        </FilterBar>
      ) : null}

      {!compact && !permissions.canEditTransactions ? <PermissionNotice /> : null}

      {!compact ? (
        <div className="space-y-3 md:hidden">
          {filtered.map((transaction) => (
            <article className="surface-card p-4" key={transaction.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {transaction.vendor || t("manualEntry")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.date)}</p>
                </div>
                <Button className="h-9 px-2" onClick={() => setEditingTransactionId(transaction.id)}>
                  <Edit3 aria-hidden="true" className="h-4 w-4" />
                  {permissions.canEditTransactions ? t("edit") : t("view")}
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-700">{transaction.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="form-label">{t("moneyIn")}</p>
                  <p className="font-semibold text-mint">
                    {transaction.money_in
                      ? formatCurrency(transaction.money_in, transaction.currency)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="form-label">{t("moneyOut")}</p>
                  <p className="font-semibold text-coral">
                    {transaction.money_out
                      ? formatCurrency(transaction.money_out, transaction.currency)
                      : "-"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-800">{categoryLabel(transaction.category)}</p>
                <p className="text-xs text-slate-500">{taxLineLabel(transaction.tax_line)}</p>
              </div>
              <div className="mt-3">
                <StatusBadges transaction={transaction} />
              </div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="surface-card px-3 py-8 text-center text-sm text-slate-500">
              {t("emptyTransactions")}
            </div>
          ) : null}
        </div>
      ) : null}

      <DataTableShell title={compact ? undefined : t("ledgerWorkspace")} description={compact ? undefined : t("ledgerWorkspaceHelp")}>
        <div className={compact ? "overflow-x-auto" : "hidden overflow-x-auto md:block"}>
          <table className="min-w-full border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">{t("date")}</th>
                <th className="px-3 py-3">{t("transaction")}</th>
                <th className="px-3 py-3">{t("source")}</th>
                <th className="px-3 py-3">{t("category")}</th>
                <th className="px-3 py-3 text-right">{t("moneyIn")}</th>
                <th className="px-3 py-3 text-right">{t("moneyOut")}</th>
                {!compact ? <th className="px-3 py-3">{t("status")}</th> : null}
                {!compact ? <th className="px-3 py-3 text-right">{t("action")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((transaction) => (
                <tr className="transition hover:bg-slate-50" key={transaction.id}>
                  <td className="table-cell whitespace-nowrap">{formatDate(transaction.date)}</td>
                  <td className="table-cell min-w-56">
                    <p className="font-medium text-ink">{transaction.vendor || t("manualEntry")}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.description}</p>
                  </td>
                  <td className="table-cell whitespace-nowrap">{transaction.source}</td>
                  <td className="table-cell min-w-52">
                    <p className="font-medium text-slate-800">{categoryLabel(transaction.category)}</p>
                    <p className="mt-1 text-xs text-slate-500">{taxLineLabel(transaction.tax_line)}</p>
                  </td>
                  <td className="table-cell text-right font-medium text-mint">
                    {transaction.money_in ? formatCurrency(transaction.money_in, transaction.currency) : "-"}
                  </td>
                  <td className="table-cell text-right font-medium text-coral">
                    {transaction.money_out ? formatCurrency(transaction.money_out, transaction.currency) : "-"}
                  </td>
                  {!compact ? (
                    <td className="table-cell">
                      <StatusBadges transaction={transaction} />
                    </td>
                  ) : null}
                  {!compact ? (
                  <td className="table-cell text-right">
                      <Button className="h-9 px-2" onClick={() => setEditingTransactionId(transaction.id)}>
                        <Edit3 aria-hidden="true" className="h-4 w-4" />
                        {permissions.canEditTransactions ? t("edit") : t("view")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={compact ? 6 : 8}>
                    <EmptyState description={t("emptyTransactionsHelp")} title={t("emptyTransactions")} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DataTableShell>
      <TransactionEditModal
        key={editingTransaction?.id ?? "transaction-edit-modal"}
        onClose={() => setEditingTransactionId(null)}
        transaction={editingTransaction}
      />
    </div>
  );
}
