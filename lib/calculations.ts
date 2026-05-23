import { categories } from "@/lib/seed-data";
import type { CategoryType, PeriodSummary, ReportRow, Transaction } from "@/lib/types";

const categoryTypeByName = new Map(categories.map((category) => [category.name, category.type]));

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function transactionNet(transaction: Transaction) {
  return roundMoney(transaction.money_in - transaction.money_out);
}

export function getTransactionYear(transaction: Transaction) {
  return Number(transaction.date.slice(0, 4));
}

export function getTransactionMonth(transaction: Transaction) {
  return Number(transaction.date.slice(5, 7));
}

export function getTransactionQuarter(transaction: Transaction) {
  return Math.ceil(getTransactionMonth(transaction) / 3);
}

export function getAvailableYears(transactions: Transaction[]) {
  const years = new Set(transactions.map((transaction) => getTransactionYear(transaction)));
  if (years.size === 0) years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

export function filterByMonth(transactions: Transaction[], year: number, month: number) {
  return transactions.filter(
    (transaction) =>
      getTransactionYear(transaction) === year && getTransactionMonth(transaction) === month
  );
}

export function filterByQuarter(transactions: Transaction[], year: number, quarter: number) {
  return transactions.filter(
    (transaction) =>
      getTransactionYear(transaction) === year && getTransactionQuarter(transaction) === quarter
  );
}

export function filterByYear(transactions: Transaction[], year: number) {
  return transactions.filter((transaction) => getTransactionYear(transaction) === year);
}

export function summarizeTransactions(transactions: Transaction[]): PeriodSummary {
  return transactions.reduce<PeriodSummary>(
    (summary, transaction) => {
      const type = categoryTypeByName.get(transaction.category) ?? "Expense";

      summary.cash_net += transactionNet(transaction);

      if (type === "Revenue") {
        summary.revenue += transaction.money_in;
      } else if (type === "COGS") {
        summary.cogs += transaction.money_out;
      } else if (type === "Expense") {
        summary.expenses += transaction.money_out;
      } else if (transaction.category === "Owner Contribution") {
        summary.owner_contributions += transaction.money_in;
      } else if (transaction.category === "Owner Draw / Member Distribution") {
        summary.owner_draws += transaction.money_out;
      } else if (transaction.category === "Investment Transfer") {
        summary.investment_transfers += transaction.money_out;
      }

      summary.gross_profit = summary.revenue - summary.cogs;
      summary.net_income = summary.revenue - summary.cogs - summary.expenses;

      return summary;
    },
    {
      revenue: 0,
      cogs: 0,
      expenses: 0,
      owner_contributions: 0,
      owner_draws: 0,
      investment_transfers: 0,
      gross_profit: 0,
      net_income: 0,
      cash_net: 0
    }
  );
}

export function groupByCategory(transactions: Transaction[]): ReportRow[] {
  const rows = new Map<string, ReportRow>();

  for (const transaction of transactions) {
    const type = categoryTypeByName.get(transaction.category) ?? "Expense";
    const existing =
      rows.get(transaction.category) ??
      ({
        label: transaction.category,
        type,
        money_in: 0,
        money_out: 0,
        net: 0
      } satisfies ReportRow);

    existing.money_in += transaction.money_in;
    existing.money_out += transaction.money_out;
    existing.net += transactionNet(transaction);
    rows.set(transaction.category, existing);
  }

  return Array.from(rows.values()).sort((a, b) => {
    const order: Record<CategoryType | "Tax", number> = {
      Revenue: 1,
      COGS: 2,
      Expense: 3,
      Equity: 4,
      Transfer: 5,
      Tax: 6
    };
    return order[a.type] - order[b.type] || a.label.localeCompare(b.label);
  });
}

export function groupByTaxLine(transactions: Transaction[]): ReportRow[] {
  const rows = new Map<string, ReportRow>();

  for (const transaction of transactions) {
    const existing =
      rows.get(transaction.tax_line) ??
      ({
        label: transaction.tax_line,
        type: "Tax",
        money_in: 0,
        money_out: 0,
        net: 0
      } satisfies ReportRow);

    existing.money_in += transaction.money_in;
    existing.money_out += transaction.money_out;
    existing.net += transactionNet(transaction);
    rows.set(transaction.tax_line, existing);
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (a.label.includes("not") && !b.label.includes("not")) return 1;
    if (!a.label.includes("not") && b.label.includes("not")) return -1;
    return a.label.localeCompare(b.label);
  });
}

export function getDashboardStats(transactions: Transaction[]) {
  const summary = summarizeTransactions(transactions);

  return {
    ...summary,
    transaction_count: transactions.length,
    unreconciled_count: transactions.filter((transaction) => !transaction.reconciled).length,
    receipts_missing_count: transactions.filter(
      (transaction) => transaction.receipt_required && !transaction.receipt_link
    ).length,
    receipts_required_count: transactions.filter((transaction) => transaction.receipt_required)
      .length
  };
}
