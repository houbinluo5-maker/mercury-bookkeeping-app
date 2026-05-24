"use client";

import { PageHeader } from "@/components/page-header";
import { ReconciliationLink } from "@/components/reconciliation-link";
import { ReceiptTable } from "@/components/receipt-table";
import { useI18n } from "@/lib/i18n";

export default function ReceiptsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("documentation")} title={t("receipts")} />
      <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <p className="text-sm text-slate-700">
          {t("receiptDocumentsNote")}
        </p>
      </div>
      <ReconciliationLink descriptionKey="reconciliationCenterReceiptsNotice" />
      <ReceiptTable />
    </div>
  );
}
