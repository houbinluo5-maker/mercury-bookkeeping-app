"use client";

import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export default function AccountsPage() {
  const { categories } = useBookkeeping();
  const { categoryDescriptionLabel, categoryLabel, categoryTypeLabel, t, taxLineLabel } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("categories")} title={t("chartOfAccounts")} />
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">{t("account")}</th>
                <th className="px-3 py-3">{t("type")}</th>
                <th className="px-3 py-3">{t("taxLine")}</th>
                <th className="px-3 py-3">{t("receipt")}</th>
                <th className="px-3 py-3">{t("description")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr className="hover:bg-slate-50" key={category.id}>
                  <td className="table-cell font-medium text-ink">{categoryLabel(category.name)}</td>
                  <td className="table-cell">{categoryTypeLabel(category.type)}</td>
                  <td className="table-cell">{taxLineLabel(category.tax_line)}</td>
                  <td className="table-cell">
                    <Badge tone={category.receipt_required_default ? "amber" : "neutral"}>
                      {category.receipt_required_default ? t("required") : t("optional")}
                    </Badge>
                  </td>
                  <td className="table-cell max-w-xl text-slate-600">
                    {categoryDescriptionLabel(category.description)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
