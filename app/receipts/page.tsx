"use client";

import { PageHeader } from "@/components/page-header";
import { ReconciliationLink } from "@/components/reconciliation-link";
import { ReceiptTable } from "@/components/receipt-table";
import { useI18n } from "@/lib/i18n";

export default function ReceiptsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("receiptsPageDescription")}
        eyebrow={t("documentation")}
        title={t("receipts")}
      />
      <div className="surface-card p-4">
        <h2 className="section-title">{t("receiptSupportPolicy")}</h2>
        <p className="section-subtitle">
          {t("receiptDocumentsNote")}
        </p>
      </div>
      <ReconciliationLink descriptionKey="reconciliationCenterReceiptsNotice" />
      <ReceiptTable />
    </div>
  );
}
