import type { Category, Transaction } from "@/lib/types";

export type ReceiptStatusFilter = "all" | "missing" | "linked" | "required" | "optional";
export type ReconciliationStatusFilter = "all" | "reconciled" | "unreconciled";
export type NeedsReviewFilter = "all" | "yes" | "no";

export type TaxPackageFilters = {
  category: string;
  endDate: string;
  needsReview: NeedsReviewFilter;
  receiptStatus: ReceiptStatusFilter;
  reconciliationStatus: ReconciliationStatusFilter;
  startDate: string;
  taxYear: number;
};

export type TaxPackageSummary = {
  advertisingExpense: number;
  bankFees: number;
  cogs: number;
  grossProfit: number;
  grossRevenue: number;
  internalTransfersInvestmentTransfers: number;
  missingReceiptsCount: number;
  needsReviewCount: number;
  netIncome: number;
  netRevenue: number;
  otherExpenses: number;
  ownerContributions: number;
  ownerDraws: number;
  paymentProcessingFees: number;
  refundsContraRevenue: number;
  shippingFulfillment: number;
  softwareExpense: number;
  unreconciledTransactionsCount: number;
  websiteHosting: number;
};

export type TaxPackageRow = Array<string | number | boolean>;

export type TaxPackageSheet = {
  headers: string[];
  name: string;
  rows: TaxPackageRow[];
};

export type TaxPackageData = {
  categorySummaryRows: TaxPackageRow[];
  filteredTransactions: Transaction[];
  missingReceiptRows: TaxPackageRow[];
  monthlyPnlRows: TaxPackageRow[];
  needsReviewRows: TaxPackageRow[];
  ownerActivityRows: TaxPackageRow[];
  quarterlyPnlRows: TaxPackageRow[];
  receiptIndexRows: TaxPackageRow[];
  reconciliationIssueRows: TaxPackageRow[];
  summary: TaxPackageSummary;
  summaryRows: TaxPackageRow[];
  transactionRows: TaxPackageRow[];
};

export const transactionLedgerHeaders = [
  "Transaction ID",
  "Date",
  "Account",
  "Source",
  "Vendor",
  "Description",
  "Currency",
  "Money In",
  "Money Out",
  "Net",
  "Category",
  "Tax Line",
  "Receipt Required",
  "Receipt Link / Path",
  "Receipt Status",
  "Reconciled",
  "Needs Review",
  "Notes"
];

export const categorySummaryHeaders = [
  "Category",
  "Type",
  "Tax Line",
  "Money In",
  "Money Out",
  "Net",
  "Tax Treatment"
];

export const pnlHeaders = [
  "Period",
  "Gross Revenue",
  "Refunds / Contra Revenue",
  "Net Revenue",
  "COGS",
  "Gross Profit",
  "Advertising Expense",
  "Shipping / Fulfillment",
  "Software Expense",
  "Website / Hosting",
  "Bank Fees",
  "Payment Processing Fees",
  "Other Expenses",
  "Net Income"
];

export const reviewQueueHeaders = [
  "Transaction ID",
  "Date",
  "Vendor",
  "Description",
  "Category",
  "Tax Line",
  "Amount",
  "Receipt Status",
  "Reconciled",
  "Notes"
];

export const receiptIndexHeaders = [
  "Transaction ID",
  "Date",
  "Vendor",
  "Category",
  "Amount",
  "Receipt Link / Path",
  "Receipt Status"
];

const namedExpenseCategories = new Set([
  "Advertising Expense",
  "Shipping / Fulfillment",
  "Software Expense",
  "Website / Hosting",
  "Bank Fees",
  "Payment Processing Fees"
]);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function signedAmount(transaction: Pick<Transaction, "money_in" | "money_out">) {
  return roundMoney(Number(transaction.money_in || 0) - Number(transaction.money_out || 0));
}

function outgoingAmount(transaction: Pick<Transaction, "money_in" | "money_out">) {
  return roundMoney(Number(transaction.money_out || 0) - Number(transaction.money_in || 0));
}

function textForClassification(transaction: Transaction) {
  return [
    transaction.category,
    transaction.tax_line,
    transaction.vendor,
    transaction.description,
    transaction.notes
  ]
    .join(" ")
    .toLowerCase();
}

function getCategoryMap(categories: Category[]) {
  return new Map(categories.map((category) => [category.name, category]));
}

function getCategoryType(transaction: Transaction, categoryMap: Map<string, Category>) {
  return categoryMap.get(transaction.category)?.type ?? "Expense";
}

function isSalesTaxPayable(transaction: Transaction) {
  return /sales tax payable|sales tax collected|sales tax remittance|state sales tax/.test(
    textForClassification(transaction)
  );
}

function isRefundOrContraRevenue(transaction: Transaction) {
  return /refund|return|chargeback|contra revenue|sales discount/.test(
    textForClassification(transaction)
  );
}

export function transactionNeedsReview(transaction: Transaction) {
  return (
    transaction.category === "Uncategorized" ||
    transaction.tax_line === "Needs review" ||
    /needs review|review manually|uncategorized/.test(textForClassification(transaction))
  );
}

export function getReceiptStatus(transaction: Transaction) {
  if (transaction.receipt_link) return "Linked";
  if (transaction.receipt_required) return "Missing";
  return "Optional";
}

function createEmptySummary(): TaxPackageSummary {
  return {
    advertisingExpense: 0,
    bankFees: 0,
    cogs: 0,
    grossProfit: 0,
    grossRevenue: 0,
    internalTransfersInvestmentTransfers: 0,
    missingReceiptsCount: 0,
    needsReviewCount: 0,
    netIncome: 0,
    netRevenue: 0,
    otherExpenses: 0,
    ownerContributions: 0,
    ownerDraws: 0,
    paymentProcessingFees: 0,
    refundsContraRevenue: 0,
    shippingFulfillment: 0,
    softwareExpense: 0,
    unreconciledTransactionsCount: 0,
    websiteHosting: 0
  };
}

function finalizeSummary(summary: TaxPackageSummary) {
  summary.netRevenue = roundMoney(summary.grossRevenue - summary.refundsContraRevenue);
  summary.grossProfit = roundMoney(summary.netRevenue - summary.cogs);
  summary.netIncome = roundMoney(
    summary.grossProfit -
      summary.advertisingExpense -
      summary.shippingFulfillment -
      summary.softwareExpense -
      summary.websiteHosting -
      summary.bankFees -
      summary.paymentProcessingFees -
      summary.otherExpenses
  );

  for (const key of Object.keys(summary) as Array<keyof TaxPackageSummary>) {
    summary[key] = roundMoney(summary[key]);
  }

  return summary;
}

function addFinancialTransactionToSummary(
  summary: TaxPackageSummary,
  transaction: Transaction,
  categoryMap: Map<string, Category>
): TaxPackageSummary {
  if (transaction.receipt_required && !transaction.receipt_link) summary.missingReceiptsCount += 1;
  if (transactionNeedsReview(transaction)) summary.needsReviewCount += 1;
  if (!transaction.reconciled) summary.unreconciledTransactionsCount += 1;

  if (isSalesTaxPayable(transaction)) return summary;

  const categoryType = getCategoryType(transaction, categoryMap);
  const expenseAmount = outgoingAmount(transaction);

  if (isRefundOrContraRevenue(transaction) && transaction.money_out > 0) {
    summary.refundsContraRevenue += transaction.money_out;
    return summary;
  }

  if (transaction.category === "Owner Contribution") {
    summary.ownerContributions += Math.max(0, signedAmount(transaction));
    return summary;
  }

  if (transaction.category === "Owner Draw / Member Distribution") {
    summary.ownerDraws += Math.max(0, expenseAmount);
    return summary;
  }

  if (transaction.category === "Investment Transfer" || transaction.category === "Internal Transfer") {
    summary.internalTransfersInvestmentTransfers += transaction.money_in + transaction.money_out;
    return summary;
  }

  if (categoryType === "Revenue") {
    summary.grossRevenue += transaction.money_in;
    summary.refundsContraRevenue += transaction.money_out;
    return summary;
  }

  if (categoryType === "COGS") {
    summary.cogs += expenseAmount;
    return summary;
  }

  if (categoryType !== "Expense") return summary;

  if (transaction.category === "Advertising Expense") summary.advertisingExpense += expenseAmount;
  else if (transaction.category === "Shipping / Fulfillment") summary.shippingFulfillment += expenseAmount;
  else if (transaction.category === "Software Expense") summary.softwareExpense += expenseAmount;
  else if (transaction.category === "Website / Hosting") summary.websiteHosting += expenseAmount;
  else if (transaction.category === "Bank Fees") summary.bankFees += expenseAmount;
  else if (transaction.category === "Payment Processing Fees") {
    summary.paymentProcessingFees += expenseAmount;
  } else {
    summary.otherExpenses += expenseAmount;
  }

  return summary;
}

function summarizeTaxPackage(transactions: Transaction[], categories: Category[]) {
  const categoryMap = getCategoryMap(categories);
  const summary = transactions.reduce(
    (currentSummary, transaction) =>
      addFinancialTransactionToSummary(currentSummary, transaction, categoryMap),
    createEmptySummary()
  );

  return finalizeSummary(summary);
}

function taxTreatment(transaction: Transaction, categoryMap: Map<string, Category>) {
  if (isSalesTaxPayable(transaction)) return "Sales tax payable - excluded from revenue";
  if (isRefundOrContraRevenue(transaction)) return "Contra revenue / refund";
  if (transaction.category === "Owner Contribution") return "Equity - not revenue";
  if (transaction.category === "Owner Draw / Member Distribution") return "Equity - not deductible";
  if (transaction.category === "Investment Transfer" || transaction.category === "Internal Transfer") {
    return "Transfer - excluded from income and expenses";
  }

  const type = getCategoryType(transaction, categoryMap);
  if (type === "Revenue") return "Revenue";
  if (type === "COGS") return "COGS";
  if (type === "Expense") return namedExpenseCategories.has(transaction.category) ? "Operating expense" : "Other expense";
  return type;
}

function buildTransactionRows(transactions: Transaction[]) {
  return transactions.map((transaction) => [
    transaction.id,
    transaction.date,
    transaction.account,
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.currency,
    transaction.money_in,
    transaction.money_out,
    signedAmount(transaction),
    transaction.category,
    transaction.tax_line,
    transaction.receipt_required ? "Yes" : "No",
    transaction.receipt_link,
    getReceiptStatus(transaction),
    transaction.reconciled ? "Yes" : "No",
    transactionNeedsReview(transaction) ? "Yes" : "No",
    transaction.notes
  ]);
}

function buildCategorySummaryRows(transactions: Transaction[], categories: Category[]) {
  const categoryMap = getCategoryMap(categories);
  const rows = new Map<string, TaxPackageRow & { taxLines?: Set<string> }>();

  for (const transaction of transactions) {
    const category = categoryMap.get(transaction.category);
    const key = transaction.category;
    const existing =
      rows.get(key) ??
      Object.assign(
        [
          key,
          category?.type ?? "Expense",
          "",
          0,
          0,
          0,
          taxTreatment(transaction, categoryMap)
        ] satisfies TaxPackageRow,
        { taxLines: new Set<string>() }
      );

    existing[3] = roundMoney(Number(existing[3]) + transaction.money_in);
    existing[4] = roundMoney(Number(existing[4]) + transaction.money_out);
    existing[5] = roundMoney(Number(existing[5]) + signedAmount(transaction));
    existing.taxLines?.add(transaction.tax_line);
    existing[2] = Array.from(existing.taxLines ?? []).sort().join("; ");
    rows.set(key, existing);
  }

  return Array.from(rows.values())
    .map((row) => row.slice() as TaxPackageRow)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function periodKey(transaction: Transaction, interval: "month" | "quarter") {
  const year = transaction.date.slice(0, 4);
  const month = Number(transaction.date.slice(5, 7));

  if (interval === "month") return `${year}-${String(month).padStart(2, "0")}`;
  return `${year} Q${Math.ceil(month / 3)}`;
}

function buildPnlRows(transactions: Transaction[], categories: Category[], interval: "month" | "quarter") {
  const periods = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = periodKey(transaction, interval);
    periods.set(key, [...(periods.get(key) ?? []), transaction]);
  }

  return Array.from(periods.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, periodTransactions]) => {
      const summary = summarizeTaxPackage(periodTransactions, categories);

      return [
        period,
        summary.grossRevenue,
        summary.refundsContraRevenue,
        summary.netRevenue,
        summary.cogs,
        summary.grossProfit,
        summary.advertisingExpense,
        summary.shippingFulfillment,
        summary.softwareExpense,
        summary.websiteHosting,
        summary.bankFees,
        summary.paymentProcessingFees,
        summary.otherExpenses,
        summary.netIncome
      ];
    });
}

function buildReviewQueueRows(transactions: Transaction[]) {
  return transactions.map((transaction) => [
    transaction.id,
    transaction.date,
    transaction.vendor,
    transaction.description,
    transaction.category,
    transaction.tax_line,
    signedAmount(transaction),
    getReceiptStatus(transaction),
    transaction.reconciled ? "Yes" : "No",
    transaction.notes
  ]);
}

function buildReceiptIndexRows(transactions: Transaction[]) {
  return transactions.map((transaction) => [
    transaction.id,
    transaction.date,
    transaction.vendor,
    transaction.category,
    signedAmount(transaction),
    transaction.receipt_link,
    getReceiptStatus(transaction)
  ]);
}

function buildSummaryRows(summary: TaxPackageSummary) {
  return [
    ["Gross Revenue", summary.grossRevenue],
    ["Refunds / Contra Revenue", summary.refundsContraRevenue],
    ["Net Revenue", summary.netRevenue],
    ["COGS", summary.cogs],
    ["Gross Profit", summary.grossProfit],
    ["Advertising Expense", summary.advertisingExpense],
    ["Shipping / Fulfillment", summary.shippingFulfillment],
    ["Software Expense", summary.softwareExpense],
    ["Website / Hosting", summary.websiteHosting],
    ["Bank Fees", summary.bankFees],
    ["Payment Processing Fees", summary.paymentProcessingFees],
    ["Other Expenses", summary.otherExpenses],
    ["Net Income", summary.netIncome],
    ["Owner Contributions", summary.ownerContributions],
    ["Owner Draws / Member Distributions", summary.ownerDraws],
    ["Internal Transfers / Investment Transfers", summary.internalTransfersInvestmentTransfers],
    ["Missing Receipts Count", summary.missingReceiptsCount],
    ["Needs Review Count", summary.needsReviewCount],
    ["Unreconciled Transactions Count", summary.unreconciledTransactionsCount]
  ];
}

export function applyTaxPackageFilters(
  transactions: Transaction[],
  categories: Category[],
  filters: TaxPackageFilters
) {
  const startDate = filters.startDate || `${filters.taxYear}-01-01`;
  const endDate = filters.endDate || `${filters.taxYear}-12-31`;
  const categoryMap = getCategoryMap(categories);

  return transactions
    .filter((transaction) => {
      if (transaction.date < startDate || transaction.date > endDate) return false;
      if (filters.category !== "all" && transaction.category !== filters.category) return false;

      if (filters.receiptStatus === "missing" && (!transaction.receipt_required || transaction.receipt_link)) {
        return false;
      }
      if (filters.receiptStatus === "linked" && !transaction.receipt_link) return false;
      if (filters.receiptStatus === "required" && !transaction.receipt_required) return false;
      if (filters.receiptStatus === "optional" && transaction.receipt_required) return false;

      if (filters.reconciliationStatus === "reconciled" && !transaction.reconciled) return false;
      if (filters.reconciliationStatus === "unreconciled" && transaction.reconciled) return false;

      const needsReview = transactionNeedsReview(transaction);
      if (filters.needsReview === "yes" && !needsReview) return false;
      if (filters.needsReview === "no" && needsReview) return false;

      return Boolean(categoryMap.get(transaction.category) || transaction.category);
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.vendor.localeCompare(b.vendor));
}

export function buildTaxPackageData(
  transactions: Transaction[],
  categories: Category[],
  filters: TaxPackageFilters
): TaxPackageData {
  const filteredTransactions = applyTaxPackageFilters(transactions, categories, filters);
  const summary = summarizeTaxPackage(filteredTransactions, categories);
  const missingReceipts = filteredTransactions.filter(
    (transaction) => transaction.receipt_required && !transaction.receipt_link
  );
  const needsReview = filteredTransactions.filter((transaction) => transactionNeedsReview(transaction));
  const ownerActivity = filteredTransactions.filter((transaction) =>
    ["Owner Contribution", "Owner Draw / Member Distribution"].includes(transaction.category)
  );
  const reconciliationIssues = filteredTransactions.filter((transaction) => !transaction.reconciled);

  return {
    categorySummaryRows: buildCategorySummaryRows(filteredTransactions, categories),
    filteredTransactions,
    missingReceiptRows: buildReviewQueueRows(missingReceipts),
    monthlyPnlRows: buildPnlRows(filteredTransactions, categories, "month"),
    needsReviewRows: buildReviewQueueRows(needsReview),
    ownerActivityRows: buildReviewQueueRows(ownerActivity),
    quarterlyPnlRows: buildPnlRows(filteredTransactions, categories, "quarter"),
    receiptIndexRows: buildReceiptIndexRows(filteredTransactions),
    reconciliationIssueRows: buildReviewQueueRows(reconciliationIssues),
    summary,
    summaryRows: buildSummaryRows(summary),
    transactionRows: buildTransactionRows(filteredTransactions)
  };
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

export function toCsv(headers: string[], rows: TaxPackageRow[]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(headers: string[], rows: TaxPackageRow[], filename: string) {
  downloadText(`\uFEFF${toCsv(headers, rows)}`, filename, "text/csv;charset=utf-8");
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellXml(value: string | number | boolean) {
  const type = typeof value === "number" && Number.isFinite(value) ? "Number" : "String";

  return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function worksheetXml(sheet: TaxPackageSheet) {
  const rows = [sheet.headers, ...sheet.rows]
    .map((row) => `<Row>${row.map(cellXml).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}"><Table>${rows}</Table></Worksheet>`;
}

export function buildTaxPackageWorkbookXml(sheets: TaxPackageSheet[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Top" />
      <Font ss:FontName="Arial" />
    </Style>
  </Styles>
  ${sheets.map(worksheetXml).join("")}
</Workbook>`;
}

export function buildTaxPackageSheets(data: TaxPackageData): TaxPackageSheet[] {
  return [
    { headers: ["Metric", "Value"], name: "Summary", rows: data.summaryRows },
    { headers: transactionLedgerHeaders, name: "Transactions", rows: data.transactionRows },
    { headers: categorySummaryHeaders, name: "Category Summary", rows: data.categorySummaryRows },
    { headers: pnlHeaders, name: "Monthly P&L", rows: data.monthlyPnlRows },
    { headers: pnlHeaders, name: "Quarterly P&L", rows: data.quarterlyPnlRows },
    { headers: reviewQueueHeaders, name: "Missing Receipts", rows: data.missingReceiptRows },
    { headers: reviewQueueHeaders, name: "Needs Review", rows: data.needsReviewRows },
    {
      headers: reviewQueueHeaders,
      name: "Owner Contributions & Draws",
      rows: data.ownerActivityRows
    },
    {
      headers: reviewQueueHeaders,
      name: "Reconciliation Issues",
      rows: data.reconciliationIssueRows
    }
  ];
}

export function downloadTaxPackageWorkbook(data: TaxPackageData, filename: string) {
  downloadText(
    buildTaxPackageWorkbookXml(buildTaxPackageSheets(data)),
    filename,
    "application/vnd.ms-excel;charset=utf-8"
  );
}
