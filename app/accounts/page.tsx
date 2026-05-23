"use client";

import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { useBookkeeping } from "@/lib/storage";

export default function AccountsPage() {
  const { categories } = useBookkeeping();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Categories" title="Chart of Accounts" />
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">Account</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Tax Line</th>
                <th className="px-3 py-3">Receipt</th>
                <th className="px-3 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr className="hover:bg-slate-50" key={category.id}>
                  <td className="table-cell font-medium text-ink">{category.name}</td>
                  <td className="table-cell">{category.type}</td>
                  <td className="table-cell">{category.tax_line}</td>
                  <td className="table-cell">
                    <Badge tone={category.receipt_required_default ? "amber" : "neutral"}>
                      {category.receipt_required_default ? "Required" : "Optional"}
                    </Badge>
                  </td>
                  <td className="table-cell max-w-xl text-slate-600">{category.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
