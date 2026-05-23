import { PageHeader } from "@/components/page-header";
import { ReceiptTable } from "@/components/receipt-table";

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Documentation" title="Receipts" />
      <ReceiptTable />
    </div>
  );
}
