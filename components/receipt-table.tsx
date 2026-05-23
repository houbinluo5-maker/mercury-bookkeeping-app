"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ReceiptUploadControl } from "@/components/receipt-upload-control";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction } from "@/lib/types";

const filters = ["all", "receiptMissing", "receiptLinked", "needsReconciliation", "reconciled"];

export function ReceiptTable() {
  const { transactions, updateTransaction } = useBookkeeping();
  const { categoryLabel, t } = useI18n();
  const [filter, setFilter] = useState("receiptMissing");
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
        if (filter === "receiptLinked") return Boolean(transaction.receipt_link);
        if (filter === "needsReconciliation") return !transaction.reconciled;
        if (filter === "reconciled") return transaction.reconciled;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filter, transactions]);

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

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-normal text-ink">{t("missingReceipts")}</h2>
            <p className="mt-1 text-sm text-slate-600">
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
              <div className="rounded-md border border-red-100 bg-red-50 p-3" key={transaction.id}>
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
                    onReceiptLinkChange={(receiptLink) =>
                      updateTransaction(transaction.id, { receipt_link: receiptLink })
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

      <div className="flex flex-wrap gap-2">
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

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
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
              {filteredTransactions.map((transaction) => (
                <tr className="hover:bg-slate-50" key={transaction.id}>
                  <td className="table-cell whitespace-nowrap">{formatDate(transaction.date)}</td>
                  <td className="table-cell min-w-60">
                    <p className="font-medium text-ink">{transaction.vendor || t("manualEntry")}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.description}</p>
                  </td>
                  <td className="table-cell min-w-48">{categoryLabel(transaction.category)}</td>
                  <td className="table-cell text-right font-medium text-slate-800">
                    {formatCurrency(transaction.money_out || transaction.money_in, transaction.currency)}
                  </td>
                  <td className="table-cell min-w-80">
                    <div className="space-y-2">
                      <input
                        className="form-input"
                        onChange={(event) =>
                          updateTransaction(transaction.id, { receipt_link: event.target.value })
                        }
                        placeholder={t("receiptLinkPlaceholder")}
                        type="text"
                        value={transaction.receipt_link}
                      />
                      <ReceiptUploadControl
                        compact
                        onReceiptLinkChange={(receiptLink) =>
                          updateTransaction(transaction.id, { receipt_link: receiptLink })
                        }
                        receiptLink={transaction.receipt_link}
                        receiptRequired={transaction.receipt_required}
                        transactionId={transaction.id}
                      />
                    </div>
                  </td>
                  <td className="table-cell min-w-48">
                    <div className="flex flex-wrap gap-2">
                      <ReceiptStatus transaction={transaction} />
                      <ReconciliationStatus transaction={transaction} />
                    </div>
                  </td>
                </tr>
              ))}
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
