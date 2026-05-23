"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, PlusCircle, Search } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button, buttonClassName } from "@/components/button";
import { downloadExcel } from "@/lib/export-excel";
import { formatCurrency, formatDate } from "@/lib/format";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction } from "@/lib/types";

export function TransactionsTable({
  transactions,
  compact = false
}: {
  transactions: Transaction[];
  compact?: boolean;
}) {
  const { categories } = useBookkeeping();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const categoryMatch = category === "All" || transaction.category === category;
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

      return categoryMatch && queryMatch;
    });
  }, [category, query, transactions]);

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-[18rem_16rem]">
            <label className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="form-input pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transactions"
                value={query}
              />
            </label>
            <select
              className="form-input"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="All">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadExcel(filtered, "bookkeeping-transactions.xls")}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Export
            </Button>
            <Link className={buttonClassName("primary")} href="/transactions/new">
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
              Add
            </Link>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Money In</th>
                <th className="px-3 py-3 text-right">Money Out</th>
                {!compact ? <th className="px-3 py-3">Status</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((transaction) => (
                <tr className="hover:bg-slate-50" key={transaction.id}>
                  <td className="table-cell whitespace-nowrap">{formatDate(transaction.date)}</td>
                  <td className="table-cell min-w-56">
                    <p className="font-medium text-ink">{transaction.vendor || "Manual entry"}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.description}</p>
                  </td>
                  <td className="table-cell whitespace-nowrap">{transaction.source}</td>
                  <td className="table-cell min-w-52">
                    <p className="font-medium text-slate-800">{transaction.category}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.tax_line}</p>
                  </td>
                  <td className="table-cell text-right font-medium text-mint">
                    {transaction.money_in ? formatCurrency(transaction.money_in, transaction.currency) : "-"}
                  </td>
                  <td className="table-cell text-right font-medium text-coral">
                    {transaction.money_out ? formatCurrency(transaction.money_out, transaction.currency) : "-"}
                  </td>
                  {!compact ? (
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={transaction.reconciled ? "green" : "amber"}>
                          {transaction.reconciled ? "Reconciled" : "Needs reconciliation"}
                        </Badge>
                        {transaction.receipt_required ? (
                          <Badge tone={transaction.receipt_link ? "green" : "red"}>
                            {transaction.receipt_link ? "Receipt linked" : "Receipt missing"}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={compact ? 6 : 7}>
                    No transactions found.
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
