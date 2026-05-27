"use client";

import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { TransactionForm } from "@/components/transaction-form";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function AddTransactionPage() {
  const { t } = useI18n();
  const { permissions } = useBookkeeping();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("manualEntry")} title={t("addTransaction")} />
      {permissions.canEditTransactions ? (
        <TransactionForm />
      ) : (
        <PermissionNotice detailKey="permissionRequiredOwnerAdmin" />
      )}
    </div>
  );
}
