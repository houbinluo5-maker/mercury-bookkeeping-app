"use client";

import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions-table";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function TransactionsPage() {
  const { transactions } = useBookkeeping();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${transactions.length} ${t("entries")}`}
        title={t("transactionsList")}
      />
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
