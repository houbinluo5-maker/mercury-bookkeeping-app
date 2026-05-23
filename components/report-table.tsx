import { formatCurrency } from "@/lib/format";
import type { ReportRow } from "@/lib/types";

export function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-3">Line</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3 text-right">Money In</th>
              <th className="px-3 py-3 text-right">Money Out</th>
              <th className="px-3 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="hover:bg-slate-50" key={`${row.type}-${row.label}`}>
                <td className="table-cell font-medium text-ink">{row.label}</td>
                <td className="table-cell">{row.type}</td>
                <td className="table-cell text-right text-mint">{formatCurrency(row.money_in)}</td>
                <td className="table-cell text-right text-coral">{formatCurrency(row.money_out)}</td>
                <td className="table-cell text-right font-semibold">{formatCurrency(row.net)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                  No report lines found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
