"use client";

import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { ReportRow } from "@/lib/types";

export function ReportTable({ rows }: { rows: ReportRow[] }) {
  const { categoryLabel, categoryTypeLabel, t, taxLineLabel } = useI18n();

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="table-head">
              <tr>
              <th className="px-3 py-3">{t("line")}</th>
              <th className="px-3 py-3">{t("type")}</th>
              <th className="px-3 py-3 text-right">{t("moneyIn")}</th>
              <th className="px-3 py-3 text-right">{t("moneyOut")}</th>
              <th className="px-3 py-3 text-right">{t("net")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="hover:bg-slate-50" key={`${row.type}-${row.label}`}>
                <td className="table-cell font-medium text-ink">
                  {row.type === "Tax" ? taxLineLabel(row.label) : categoryLabel(row.label)}
                </td>
                <td className="table-cell">{categoryTypeLabel(row.type)}</td>
                <td className="table-cell text-right text-mint">{formatCurrency(row.money_in)}</td>
                <td className="table-cell text-right text-coral">{formatCurrency(row.money_out)}</td>
                <td className="table-cell text-right font-semibold">{formatCurrency(row.net)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                  {t("emptyReportRows")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
