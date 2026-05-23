"use client";

import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";
import { useI18n } from "@/lib/i18n";

export default function AddTransactionPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("manualEntry")} title={t("addTransaction")} />
      <TransactionForm />
    </div>
  );
}
