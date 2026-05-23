import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";

export default function AddTransactionPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manual entry" title="Add Transaction" />
      <TransactionForm />
    </div>
  );
}
