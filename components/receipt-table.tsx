"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { useBookkeeping } from "@/lib/storage";

export function ReceiptTable() {
  const { transactions, updateTransaction } = useBookkeeping();
  const receiptTransactions = transactions
    .filter((transaction) => transaction.receipt_required)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Receipt</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {receiptTransactions.map((transaction) => (
              <tr className="hover:bg-slate-50" key={transaction.id}>
                <td className="table-cell whitespace-nowrap">{formatDate(transaction.date)}</td>
                <td className="table-cell min-w-56">
                  <p className="font-medium text-ink">{transaction.vendor}</p>
                  <p className="mt-1 text-xs text-slate-500">{transaction.description}</p>
                </td>
                <td className="table-cell">{transaction.category}</td>
                <td className="table-cell text-right font-medium text-coral">
                  {formatCurrency(transaction.money_out, transaction.currency)}
                </td>
                <td className="table-cell min-w-80">
                  <div className="flex items-center gap-2">
                    <input
                      className="form-input"
                      defaultValue={transaction.receipt_link}
                      onBlur={(event) =>
                        updateTransaction(transaction.id, { receipt_link: event.target.value })
                      }
                      placeholder="https://..."
                      type="url"
                    />
                    {transaction.receipt_link ? (
                      <a
                        aria-label="Open receipt"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50"
                        href={transaction.receipt_link}
                        rel="noreferrer"
                        target="_blank"
                        title="Open receipt"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="table-cell">
                  <Badge tone={transaction.receipt_link ? "green" : "red"}>
                    {transaction.receipt_link ? "Linked" : "Missing"}
                  </Badge>
                </td>
              </tr>
            ))}
            {receiptTransactions.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>
                  No receipt-required transactions.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
