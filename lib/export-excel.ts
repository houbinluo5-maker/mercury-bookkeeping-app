import { groupByCategory, groupByTaxLine, summarizeTransactions } from "@/lib/calculations";
import type { Transaction } from "@/lib/types";

function escapeCell(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableHtml(title: string, headers: string[], rows: Array<Array<string | number | boolean>>) {
  const headerHtml = headers.map((header) => `<th>${escapeCell(header)}</th>`).join("");
  const rowHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  return `<h2>${escapeCell(title)}</h2><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table>`;
}

export function buildExcelWorkbook(transactions: Transaction[], title = "bookkeeping-export") {
  const summary = summarizeTransactions(transactions);
  const categoryRows = groupByCategory(transactions);
  const taxRows = groupByTaxLine(transactions);

  const transactionRows = transactions.map((transaction) => [
    transaction.date,
    transaction.account,
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.currency,
    transaction.money_in,
    transaction.money_out,
    transaction.category,
    transaction.tax_line,
    transaction.receipt_required ? "Yes" : "No",
    transaction.receipt_link,
    transaction.reconciled ? "Yes" : "No",
    transaction.notes
  ]);

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 24px; }
          th { background: #e8edf3; font-weight: 700; }
          td, th { border: 1px solid #cbd5e1; padding: 6px 8px; }
          h2 { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${escapeCell(title)}</h1>
        ${tableHtml("Summary", ["Metric", "Amount"], [
          ["Revenue", summary.revenue],
          ["COGS", summary.cogs],
          ["Expenses", summary.expenses],
          ["Gross Profit", summary.gross_profit],
          ["Net Income", summary.net_income],
          ["Owner Contributions", summary.owner_contributions],
          ["Owner Draws", summary.owner_draws],
          ["Investment Transfers", summary.investment_transfers],
          ["Cash Net", summary.cash_net]
        ])}
        ${tableHtml(
          "Category Report",
          ["Category", "Type", "Money In", "Money Out", "Net"],
          categoryRows.map((row) => [row.label, row.type, row.money_in, row.money_out, row.net])
        )}
        ${tableHtml(
          "Tax Line Report",
          ["Tax Line", "Money In", "Money Out", "Net"],
          taxRows.map((row) => [row.label, row.money_in, row.money_out, row.net])
        )}
        ${tableHtml(
          "Transactions",
          [
            "Date",
            "Account",
            "Source",
            "Vendor",
            "Description",
            "Currency",
            "Money In",
            "Money Out",
            "Category",
            "Tax Line",
            "Receipt Required",
            "Receipt Link",
            "Reconciled",
            "Notes"
          ],
          transactionRows
        )}
      </body>
    </html>
  `;

  return workbook;
}

export function downloadExcel(transactions: Transaction[], filename = "bookkeeping-export.xls") {
  const workbook = buildExcelWorkbook(transactions, filename.replace(/\.xls$/i, ""));
  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
