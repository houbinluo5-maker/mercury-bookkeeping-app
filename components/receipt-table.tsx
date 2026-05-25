"use client";

import { useMemo, useState } from "react";
import { AuditHistoryPanel } from "@/components/audit-history-panel";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ReceiptUploadControl } from "@/components/receipt-upload-control";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { promptOptionalAuditReason, promptRequiredAuditReason } from "@/lib/audit-reason";
import { isDateInClosedPeriod } from "@/lib/monthly-closing";
import { isExpenseReceiptCategory } from "@/lib/receipt-requirements";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction } from "@/lib/types";

const filters = [
  "all",
  "receiptMissing",
  "expenseReceiptsRequired",
  "receiptLinked",
  "needsReconciliation",
  "reconciled"
];

export function ReceiptTable() {
  const { auditLogs, categories, monthlyClosings, transactions, updateTransaction } = useBookkeeping();
  const { categoryLabel, t } = useI18n();
  const [filter, setFilter] = useState("receiptMissing");
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const categoryByName = useMemo(
    () => new Map(categories.map((category) => [category.name, category])),
    [categories]
  );
  const missingReceipts = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.receipt_required && !transaction.receipt_link)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        if (filter === "receiptMissing") {
          return transaction.receipt_required && !transaction.receipt_link;
        }
        if (filter === "expenseReceiptsRequired") {
          return (
            transaction.receipt_required &&
            isExpenseReceiptCategory(categoryByName.get(transaction.category))
          );
        }
        if (filter === "receiptLinked") return Boolean(transaction.receipt_link);
        if (filter === "needsReconciliation") return !transaction.reconciled;
        if (filter === "reconciled") return transaction.reconciled;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [categoryByName, filter, transactions]);

  function ReceiptStatus({ transaction }: { transaction: Transaction }) {
    if (transaction.receipt_link) return <Badge tone="green">{t("receiptLinked")}</Badge>;
    if (transaction.receipt_required) return <Badge tone="red">{t("receiptMissing")}</Badge>;
    return <Badge tone="neutral">{t("receiptOptional")}</Badge>;
  }

  function ReconciliationStatus({ transaction }: { transaction: Transaction }) {
    return (
      <Badge tone={transaction.reconciled ? "green" : "amber"}>
        {transaction.reconciled ? t("reconciled") : t("needsReconciliation")}
      </Badge>
    );
  }

  function receiptInputValue(transaction: Transaction) {
    return receiptDrafts[transaction.id] ?? transaction.receipt_link;
  }

  function commitReceiptLink(transaction: Transaction) {
    const nextValue = receiptInputValue(transaction).trim();

    if (nextValue === transaction.receipt_link) return;

    let reason = "";

    if (transaction.receipt_link && !nextValue) {
      const response = isDateInClosedPeriod(monthlyClosings, transaction.date)
        ? promptRequiredAuditReason(t, t("deleteReceipt"))
        : promptOptionalAuditReason(t, t("deleteReceipt"));

      if (response === null) {
        setReceiptDrafts((current) => ({ ...current, [transaction.id]: transaction.receipt_link }));
        return;
      }

      reason = response;
    }

    updateTransaction(
      transaction.id,
      { receipt_link: nextValue },
      {
        reason,
        source: "manual"
      }
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("missingReceipts")}</h2>
            <p className="section-subtitle">
              {t("transactionsNeedReceiptLinks").replace("{count}", String(missingReceipts.length))}
            </p>
          </div>
          <Badge tone={missingReceipts.length ? "red" : "green"}>
            {missingReceipts.length ? t("actionNeeded") : t("allLinked")}
          </Badge>
        </div>
        {missingReceipts.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {missingReceipts.slice(0, 6).map((transaction) => (
              <div className="rounded-md border border-red-100 bg-red-50/80 p-3" key={transaction.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{transaction.vendor}</p>
                    <p className="mt-1 text-xs text-slate-600">{transaction.description}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-coral">
                    {formatCurrency(transaction.money_out || transaction.money_in, transaction.currency)}
                  </p>
                </div>
                <div className="mt-3">
                  <ReceiptUploadControl
                    compact
                    onReceiptLinkChange={(receiptLink, audit) =>
                      updateTransaction(
                        transaction.id,
                        { receipt_link: receiptLink },
                        {
                          actionsByField: audit?.action ? { receipt_link: audit.action } : undefined,
                          reason: audit?.reason,
                          source: audit?.source ?? "receipt_upload"
                        }
                      )
                    }
                    receiptLink={transaction.receipt_link}
                    receiptRequired={transaction.receipt_required}
                    transactionId={transaction.id}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="surface-card flex flex-wrap gap-2 p-3">
        {filters.map((item) => (
          <Button
            className={filter === item ? "border-marine bg-marine text-white hover:bg-ink" : ""}
            key={item}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? t("allStatuses") : t(item)}
          </Button>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">{t("date")}</th>
                <th className="px-3 py-3">{t("transaction")}</th>
                <th className="px-3 py-3">{t("category")}</th>
                <th className="px-3 py-3 text-right">{t("amount")}</th>
                <th className="px-3 py-3">{t("receiptLink")}</th>
                <th className="px-3 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const transactionAuditLogs = auditLogs.filter(
                  (entry) => entry.entity_id === transaction.id
                );

                return (
                  <tr className="transition hover:bg-slate-50" key={transaction.id}>
                    <td className="table-cell whitespace-nowrap">{formatDate(transaction.date)}</td>
                    <td className="table-cell min-w-60">
                      <p className="font-medium text-ink">{transaction.vendor || t("manualEntry")}</p>
                      <p className="mt-1 text-xs text-slate-500">{transaction.description}</p>
                    </td>
                    <td className="table-cell min-w-48">{categoryLabel(transaction.category)}</td>
                    <td className="table-cell text-right font-medium text-slate-800">
                      {formatCurrency(transaction.money_out || transaction.money_in, transaction.currency)}
                    </td>
                    <td className="table-cell min-w-[24rem]">
                      <div className="space-y-3">
                        <input
                          className="form-input"
                          onBlur={() => commitReceiptLink(transaction)}
                          onChange={(event) =>
                            setReceiptDrafts((current) => ({
                              ...current,
                              [transaction.id]: event.target.value
                            }))
                          }
                          placeholder={t("receiptLinkPlaceholder")}
                          type="text"
                          value={receiptInputValue(transaction)}
                        />
                        <ReceiptUploadControl
                          compact
                          onReceiptLinkChange={(receiptLink, audit) => {
                            setReceiptDrafts((current) => ({
                              ...current,
                              [transaction.id]: receiptLink
                            }));
                            updateTransaction(
                              transaction.id,
                              { receipt_link: receiptLink },
                              {
                                actionsByField: audit?.action
                                  ? { receipt_link: audit.action }
                                  : undefined,
                                reason: audit?.reason,
                                source: audit?.source ?? "receipt_upload"
                              }
                            );
                          }}
                          receiptLink={transaction.receipt_link}
                          receiptRequired={transaction.receipt_required}
                          transactionId={transaction.id}
                        />
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-marine">
                            {t("auditHistory")}
                          </summary>
                          <div className="mt-3">
                            <AuditHistoryPanel
                              emptyLabel={t("noAuditEntries")}
                              entries={transactionAuditLogs}
                              limit={6}
                            />
                          </div>
                        </details>
                      </div>
                    </td>
                    <td className="table-cell min-w-48">
                      <div className="flex flex-wrap gap-2">
                        <ReceiptStatus transaction={transaction} />
                        <ReconciliationStatus transaction={transaction} />
                        {isDateInClosedPeriod(monthlyClosings, transaction.date) ? (
                          <Badge tone="red">{t("closedPeriod")}</Badge>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>
                    {t("noReceiptTransactions")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
