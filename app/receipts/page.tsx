import { PageHeader } from "@/components/page-header";
import { ReceiptTable } from "@/components/receipt-table";

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Documentation" title="Receipts" />
      <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <p className="text-sm text-slate-700">
          Acceptable receipt documents include Meta invoices, Shopify invoices, supplier invoices,
          shipping bills, domain or hosting invoices, bank statements, and payment confirmations.
          Add a link to the private document location for each transaction that needs support.
        </p>
      </div>
      <ReceiptTable />
    </div>
  );
}
