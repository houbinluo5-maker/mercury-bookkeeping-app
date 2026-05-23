"use client";

import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions-table";
import { useBookkeeping } from "@/lib/storage";

export default function TransactionsPage() {
  const { transactions } = useBookkeeping();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${transactions.length} entries`} title="Transactions List" />
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
