import type { Category, Transaction } from "@/lib/types";

export const duplicateIgnoreTagPrefix = "[not-duplicate:";
export const reviewResolvedTag = "[review-resolved]";

export type ReconciliationIssueKey =
  | "missingReceipts"
  | "needsReview"
  | "uncategorizedTransactions"
  | "unreconciledTransactions"
  | "possibleDuplicates"
  | "revenueDeposits"
  | "expensePayments"
  | "ownerActivity"
  | "internalTransfers"
  | "taxPackageIssues";

export type ReconciliationIssueFilter = "all" | ReconciliationIssueKey;
export type ReceiptStatusFilter = "all" | "missing" | "linked" | "required" | "optional";
export type ReconciliationStatusFilter = "all" | "reconciled" | "unreconciled";
export type ReviewStatusFilter = "all" | "needsReview" | "clean";
export type IssueLevel = "info" | "review" | "important";
export type DuplicateConfidence = "high" | "medium";

export type ReasonCode =
  | "reasonReceiptMissing"
  | "reasonExpenseReceiptOptional"
  | "reasonExpenseMissingReceipt"
  | "reasonExpenseUncategorized"
  | "reasonTaxLineNeedsReview"
  | "reasonUncategorized"
  | "reasonNotesNeedReview"
  | "reasonLowConfidence"
  | "reasonTransactionUnreconciled"
  | "reasonSameDay"
  | "reasonWithinOneDay"
  | "reasonSameAmount"
  | "reasonSimilarVendor"
  | "reasonSimilarSource"
  | "reasonSimilarDescription"
  | "reasonPayoutNeedsReconciliation"
  | "reasonRevenueCategoryMismatch"
  | "reasonOwnerContributionMisclassified"
  | "reasonTransferMisclassifiedAsRevenue"
  | "reasonUnknownIncomeSource"
  | "reasonManualRevenueReview"
  | "reasonOwnerContributionDirection"
  | "reasonOwnerDrawDirection"
  | "reasonTransferNeedsClarification"
  | "reasonTransferTouchesNetIncome"
  | "reasonSalesTaxExcluded"
  | "reasonTaxPackageBlocking";

export type ReconciliationFilters = {
  category: string;
  endDate: string;
  issueType: ReconciliationIssueFilter;
  month: string;
  receiptStatus: ReceiptStatusFilter;
  reconciliationStatus: ReconciliationStatusFilter;
  reviewStatus: ReviewStatusFilter;
  startDate: string;
};

export type TransactionIssue = {
  id: string;
  issueKey: Exclude<ReconciliationIssueKey, "possibleDuplicates">;
  level: IssueLevel;
  reasonCodes: ReasonCode[];
  transaction: Transaction;
};

export type DuplicateCandidate = {
  confidence: DuplicateConfidence;
  id: string;
  level: IssueLevel;
  reasonCodes: ReasonCode[];
  first: Transaction;
  second: Transaction;
};

export type ReadinessIssue = {
  count: number;
  deduction: number;
  key: string;
  labelKey: string;
  level: IssueLevel;
};

export type ReconciliationSummary = {
  expensePaymentsNeedingReceipts: number;
  missingReceipts: number;
  monthlyReadinessScore: number;
  monthlyReadinessStatus: "ready" | "needsReview" | "notReady";
  needsReview: number;
  ownerTransfersNeedingReview: number;
  possibleDuplicates: number;
  revenueDepositsNeedingReview: number;
  topIssueCount: number;
  totalTransactions: number;
  uncategorizedTransactions: number;
  unresolvedIssueCount: number;
  unreconciledTransactions: number;
};

export type CsvRow = Array<string | number | boolean>;

export type ReconciliationData = {
  allIssueRows: CsvRow[];
  duplicateCandidates: DuplicateCandidate[];
  duplicateRows: CsvRow[];
  expensePayments: TransactionIssue[];
  filteredTransactions: Transaction[];
  internalTransfers: TransactionIssue[];
  missingReceipts: TransactionIssue[];
  monthOptions: string[];
  needsReview: TransactionIssue[];
  ownerActivity: TransactionIssue[];
  readinessChecklistRows: CsvRow[];
  revenueDeposits: TransactionIssue[];
  summary: ReconciliationSummary;
  taxPackageIssues: TransactionIssue[];
  topIssues: ReadinessIssue[];
  uncategorizedExpenseCount: number;
  uncategorizedTransactions: TransactionIssue[];
  unclearOwnerTransferCount: number;
  unreconciledTransactions: TransactionIssue[];
};

export const reconciliationIssueHeaders = [
  "Issue Type",
  "Level",
  "Transaction ID",
  "Date",
  "Vendor",
  "Source",
  "Category",
  "Tax Line",
  "Amount",
  "Receipt Status",
  "Reconciled",
  "Reasons",
  "Notes"
];

export const duplicateCandidateHeaders = [
  "Candidate ID",
  "Confidence",
  "Transaction A ID",
  "Transaction B ID",
  "Date A",
  "Date B",
  "Vendor A",
  "Vendor B",
  "Amount",
  "Reasons"
];

export const readinessChecklistHeaders = ["Item", "Value", "Status", "Details"];

export const reconciliationReasonLabels: Record<ReasonCode, string> = {
  reasonReceiptMissing: "Receipt is required but no receipt link is attached.",
  reasonExpenseReceiptOptional: "Expense or COGS payment should usually require a receipt.",
  reasonExpenseMissingReceipt: "Expense or COGS payment is still missing a receipt.",
  reasonExpenseUncategorized: "Expense payment is still uncategorized.",
  reasonTaxLineNeedsReview: "Tax line is still set to Needs review.",
  reasonUncategorized: "Category is still Uncategorized.",
  reasonNotesNeedReview: "Notes still indicate manual review is needed.",
  reasonLowConfidence: "Parser or import note suggests low confidence review is needed.",
  reasonTransactionUnreconciled: "Transaction is not marked reconciled.",
  reasonSameDay: "Transactions landed on the same date.",
  reasonWithinOneDay: "Transactions landed within one day of each other.",
  reasonSameAmount: "Transactions share the same amount and direction.",
  reasonSimilarVendor: "Vendor names look similar.",
  reasonSimilarSource: "Sources look similar.",
  reasonSimilarDescription: "Descriptions look similar.",
  reasonPayoutNeedsReconciliation: "Revenue payout should be reconciled to source reports.",
  reasonRevenueCategoryMismatch: "Income deposit category should be Revenue, Owner Contribution, or Transfer.",
  reasonOwnerContributionMisclassified: "Owner contribution appears to be classified as revenue.",
  reasonTransferMisclassifiedAsRevenue: "Internal or investment transfer appears to be classified as revenue.",
  reasonUnknownIncomeSource: "Income source is unclear and needs confirmation.",
  reasonManualRevenueReview: "Manual revenue entry should be reviewed before closing.",
  reasonOwnerContributionDirection: "Owner contribution should normally be money in, not money out.",
  reasonOwnerDrawDirection: "Owner draw should normally be money out, not money in.",
  reasonTransferNeedsClarification: "Transfer details are unclear and should be reviewed.",
  reasonTransferTouchesNetIncome: "Transfer classification should not affect net income.",
  reasonSalesTaxExcluded: "Sales tax payable text suggests this should be excluded from revenue.",
  reasonTaxPackageBlocking: "This item will likely block a clean CPA or tax package export."
};

const duplicateReasonCodes = new Set<ReasonCode>([
  "reasonSameDay",
  "reasonWithinOneDay",
  "reasonSameAmount",
  "reasonSimilarVendor",
  "reasonSimilarSource",
  "reasonSimilarDescription"
]);

const importantReasonCodes = new Set<ReasonCode>([
  "reasonReceiptMissing",
  "reasonExpenseMissingReceipt",
  "reasonExpenseUncategorized",
  "reasonTaxLineNeedsReview",
  "reasonUncategorized",
  "reasonRevenueCategoryMismatch",
  "reasonOwnerContributionMisclassified",
  "reasonTransferMisclassifiedAsRevenue",
  "reasonOwnerContributionDirection",
  "reasonOwnerDrawDirection",
  "reasonTransferTouchesNetIncome",
  "reasonTaxPackageBlocking"
]);

const reviewReasonCodes = new Set<ReasonCode>([
  "reasonExpenseReceiptOptional",
  "reasonNotesNeedReview",
  "reasonLowConfidence",
  "reasonTransactionUnreconciled",
  "reasonPayoutNeedsReconciliation",
  "reasonUnknownIncomeSource",
  "reasonManualRevenueReview",
  "reasonTransferNeedsClarification",
  "reasonSalesTaxExcluded"
]);

const payoutPattern = /shopify|stripe|paypal|payout|deposit|merchant|sales/i;
const ownerPattern = /owner|capital contribution|member contribution/i;
const transferPattern = /transfer|brokerage|internal/i;
const salesTaxPattern = /sales tax payable|sales tax collected|sales tax remittance|state sales tax/i;
const reviewPattern = /needs review|review manually|manual review|possible duplicate|follow up/i;
const lowConfidencePattern = /low confidence|unclear|import warning|possible duplicate/i;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function signedAmount(transaction: Transaction) {
  return roundMoney(transaction.money_in - transaction.money_out);
}

function absoluteTransactionAmount(transaction: Transaction) {
  return roundMoney(Math.max(transaction.money_in, transaction.money_out));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function similarityScore(left: string, right: string) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return 0.85;
  }

  const leftTokens = new Set(tokenize(normalizedLeft));
  const rightTokens = new Set(tokenize(normalizedRight));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function categoryMap(categories: Category[]) {
  return new Map(categories.map((category) => [category.name, category]));
}

function categoryType(transaction: Transaction, categoriesByName: Map<string, Category>) {
  return categoriesByName.get(transaction.category)?.type ?? "Expense";
}

function monthKey(transaction: Transaction) {
  return transaction.date.slice(0, 7);
}

function issueLevel(reasonCodes: ReasonCode[], fallback: IssueLevel = "review"): IssueLevel {
  if (reasonCodes.some((reasonCode) => importantReasonCodes.has(reasonCode))) return "important";
  if (reasonCodes.some((reasonCode) => reviewReasonCodes.has(reasonCode))) return "review";
  return fallback;
}

function dedupeReasonCodes(reasonCodes: ReasonCode[]) {
  return Array.from(new Set(reasonCodes));
}

function transactionText(transaction: Transaction) {
  return [
    transaction.source,
    transaction.vendor,
    transaction.description,
    transaction.notes,
    transaction.category,
    transaction.tax_line
  ].join(" ");
}

function isReviewResolved(notes: string) {
  return notes.includes(reviewResolvedTag);
}

function buildReviewReasonCodes(transaction: Transaction) {
  const reasonCodes: ReasonCode[] = [];

  if (transaction.category === "Uncategorized") {
    reasonCodes.push("reasonUncategorized");
  }
  if (transaction.tax_line === "Needs review") {
    reasonCodes.push("reasonTaxLineNeedsReview");
  }
  if (!isReviewResolved(transaction.notes) && reviewPattern.test(transaction.notes)) {
    reasonCodes.push("reasonNotesNeedReview");
  }
  if (!isReviewResolved(transaction.notes) && lowConfidencePattern.test(transaction.notes)) {
    reasonCodes.push("reasonLowConfidence");
  }

  return dedupeReasonCodes(reasonCodes);
}

function matchesReceiptStatus(transaction: Transaction, filter: ReceiptStatusFilter) {
  if (filter === "all") return true;
  if (filter === "missing") return transaction.receipt_required && !transaction.receipt_link;
  if (filter === "linked") return Boolean(transaction.receipt_link);
  if (filter === "required") return transaction.receipt_required;
  return !transaction.receipt_required;
}

function matchesReconciliationStatus(
  transaction: Transaction,
  filter: ReconciliationStatusFilter
) {
  if (filter === "all") return true;
  if (filter === "reconciled") return transaction.reconciled;
  return !transaction.reconciled;
}

function matchesReviewStatus(transaction: Transaction, filter: ReviewStatusFilter) {
  const hasReview = buildReviewReasonCodes(transaction).length > 0;

  if (filter === "all") return true;
  if (filter === "needsReview") return hasReview;
  return !hasReview;
}

function matchesDateFilters(transaction: Transaction, filters: ReconciliationFilters) {
  if (filters.startDate && transaction.date < filters.startDate) return false;
  if (filters.endDate && transaction.date > filters.endDate) return false;
  if (filters.month !== "all" && monthKey(transaction) !== filters.month) return false;
  return true;
}

function createTransactionIssue(
  transaction: Transaction,
  issueKey: Exclude<ReconciliationIssueKey, "possibleDuplicates">,
  reasonCodes: ReasonCode[],
  fallbackLevel: IssueLevel = "review"
) {
  return {
    id: `${issueKey}:${transaction.id}`,
    issueKey,
    level: issueLevel(reasonCodes, fallbackLevel),
    reasonCodes: dedupeReasonCodes(reasonCodes),
    transaction
  } satisfies TransactionIssue;
}

function isReceiptMissing(transaction: Transaction) {
  return transaction.receipt_required && !transaction.receipt_link;
}

function buildExpenseReasonCodes(transaction: Transaction, categoriesByName: Map<string, Category>) {
  const reasonCodes: ReasonCode[] = [];
  const type = categoryType(transaction, categoriesByName);
  const isExpensePayment =
    transaction.money_out > 0 &&
    (type === "Expense" || type === "COGS" || transaction.category === "Uncategorized");

  if (!isExpensePayment) return reasonCodes;
  if (transaction.category === "Uncategorized") {
    reasonCodes.push("reasonExpenseUncategorized");
  }
  if (!transaction.receipt_required) {
    reasonCodes.push("reasonExpenseReceiptOptional");
  }
  if (isReceiptMissing(transaction)) {
    reasonCodes.push("reasonExpenseMissingReceipt");
  }
  if (transaction.tax_line === "Needs review") {
    reasonCodes.push("reasonTaxLineNeedsReview");
  }

  return dedupeReasonCodes(reasonCodes);
}

function buildRevenueReasonCodes(transaction: Transaction, categoriesByName: Map<string, Category>) {
  const reasonCodes: ReasonCode[] = [];

  if (transaction.money_in <= 0) return reasonCodes;

  const type = categoryType(transaction, categoriesByName);
  const combinedText = transactionText(transaction);
  const looksLikePayout = payoutPattern.test(combinedText);
  const looksLikeOwner = ownerPattern.test(combinedText);
  const looksLikeTransfer = transferPattern.test(combinedText);
  const allowedCategory =
    transaction.category === "Revenue" ||
    transaction.category === "Owner Contribution" ||
    transaction.category === "Investment Transfer" ||
    transaction.category === "Internal Transfer";

  if (!allowedCategory) {
    reasonCodes.push("reasonRevenueCategoryMismatch");
  }
  if (looksLikeOwner && transaction.category === "Revenue") {
    reasonCodes.push("reasonOwnerContributionMisclassified");
  }
  if (looksLikeTransfer && transaction.category === "Revenue") {
    reasonCodes.push("reasonTransferMisclassifiedAsRevenue");
  }
  if (looksLikePayout && !transaction.reconciled) {
    reasonCodes.push("reasonPayoutNeedsReconciliation");
  }
  if (transaction.category === "Revenue" && (transaction.source === "Manual" || !transaction.vendor.trim())) {
    reasonCodes.push("reasonManualRevenueReview");
  }
  if (type === "Revenue" && !looksLikePayout && !looksLikeOwner && !looksLikeTransfer) {
    reasonCodes.push("reasonUnknownIncomeSource");
  }

  return dedupeReasonCodes(reasonCodes);
}

function buildOwnerReasonCodes(transaction: Transaction) {
  const reasonCodes: ReasonCode[] = [];
  const combinedText = transactionText(transaction);

  if (
    transaction.category !== "Owner Contribution" &&
    transaction.category !== "Owner Draw / Member Distribution"
  ) {
    return reasonCodes;
  }

  if (transaction.category === "Owner Contribution" && transaction.money_in <= 0) {
    reasonCodes.push("reasonOwnerContributionDirection");
  }
  if (
    transaction.category === "Owner Draw / Member Distribution" &&
    transaction.money_out <= 0
  ) {
    reasonCodes.push("reasonOwnerDrawDirection");
  }
  if (transaction.tax_line === "Needs review" || reviewPattern.test(combinedText)) {
    reasonCodes.push("reasonTransferNeedsClarification");
  }
  if (!transaction.reconciled) {
    reasonCodes.push("reasonTransactionUnreconciled");
  }

  return dedupeReasonCodes(reasonCodes);
}

function buildInternalTransferReasonCodes(transaction: Transaction) {
  const reasonCodes: ReasonCode[] = [];
  const isTransfer =
    transaction.category === "Investment Transfer" || transaction.category === "Internal Transfer";

  if (!isTransfer) return reasonCodes;

  if (transaction.tax_line === "Needs review" || reviewPattern.test(transactionText(transaction))) {
    reasonCodes.push("reasonTransferNeedsClarification");
  }
  if (transaction.tax_line.toLowerCase().includes("expense")) {
    reasonCodes.push("reasonTransferTouchesNetIncome");
  }
  if (!transaction.reconciled) {
    reasonCodes.push("reasonTransactionUnreconciled");
  }

  return dedupeReasonCodes(reasonCodes);
}

function buildTaxPackageReasonCodes(
  transaction: Transaction,
  categoriesByName: Map<string, Category>
) {
  const reasonCodes: ReasonCode[] = [];
  const reviewReasonCodes = buildReviewReasonCodes(transaction);
  const revenueReasonCodes = buildRevenueReasonCodes(transaction, categoriesByName);
  const ownerReasonCodes = buildOwnerReasonCodes(transaction);
  const internalTransferReasonCodes = buildInternalTransferReasonCodes(transaction);
  const expenseReasonCodes = buildExpenseReasonCodes(transaction, categoriesByName);

  if (reviewReasonCodes.length > 0) {
    reasonCodes.push("reasonTaxPackageBlocking");
  }
  if (expenseReasonCodes.includes("reasonExpenseMissingReceipt")) {
    reasonCodes.push("reasonTaxPackageBlocking");
  }
  if (
    !transaction.reconciled &&
    (transaction.money_in > 0 ||
      transaction.category === "Owner Contribution" ||
      transaction.category === "Owner Draw / Member Distribution" ||
      transaction.category === "Investment Transfer" ||
      transaction.category === "Internal Transfer")
  ) {
    reasonCodes.push("reasonTaxPackageBlocking");
  }
  if (salesTaxPattern.test(transactionText(transaction)) && transaction.category === "Revenue") {
    reasonCodes.push("reasonSalesTaxExcluded");
  }

  return dedupeReasonCodes([
    ...reasonCodes,
    ...reviewReasonCodes,
    ...revenueReasonCodes,
    ...ownerReasonCodes,
    ...internalTransferReasonCodes
  ]);
}

function dayDifference(leftDate: string, rightDate: string) {
  const left = new Date(`${leftDate}T00:00:00`).getTime();
  const right = new Date(`${rightDate}T00:00:00`).getTime();
  return Math.abs(left - right) / (1000 * 60 * 60 * 24);
}

function duplicateIgnoreTag(firstId: string, secondId: string) {
  return `${duplicateIgnoreTagPrefix}${[firstId, secondId].sort().join("|")}]`;
}

export function appendDuplicateIgnoreTag(notes: string, firstId: string, secondId: string) {
  const tag = duplicateIgnoreTag(firstId, secondId);
  return notes.includes(tag) ? notes : `${notes.trim()} ${tag}`.trim();
}

export function appendReviewResolvedTag(notes: string) {
  return notes.includes(reviewResolvedTag)
    ? notes
    : `${notes.trim()} ${reviewResolvedTag}`.trim();
}

export function clearReviewSignals(notes: string) {
  return notes
    .replace(/\[review-resolved\]/gi, "")
    .replace(/needs review/gi, "")
    .replace(/review manually/gi, "")
    .replace(/manual review/gi, "")
    .replace(/low confidence/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shouldIgnoreDuplicate(first: Transaction, second: Transaction) {
  const ignoreTag = duplicateIgnoreTag(first.id, second.id);
  return first.notes.includes(ignoreTag) || second.notes.includes(ignoreTag);
}

function createDuplicateCandidate(
  first: Transaction,
  second: Transaction
): DuplicateCandidate | null {
  const [primaryTransaction, duplicateTransaction] = [first, second].sort((left, right) => {
    return (
      left.date.localeCompare(right.date) ||
      left.created_at.localeCompare(right.created_at) ||
      left.id.localeCompare(right.id)
    );
  });

  if (shouldIgnoreDuplicate(first, second)) return null;
  if (Math.abs(signedAmount(first)) !== Math.abs(signedAmount(second))) return null;
  if (Math.sign(signedAmount(first)) !== Math.sign(signedAmount(second))) return null;

  const differenceInDays = dayDifference(first.date, second.date);
  if (differenceInDays > 1) return null;

  const vendorScore = similarityScore(first.vendor, second.vendor);
  const sourceScore = similarityScore(first.source, second.source);
  const descriptionScore = similarityScore(first.description, second.description);

  if (vendorScore < 0.55 && sourceScore < 0.75 && descriptionScore < 0.55) {
    return null;
  }

  const reasonCodes: ReasonCode[] = [];
  if (differenceInDays === 0) reasonCodes.push("reasonSameDay");
  else reasonCodes.push("reasonWithinOneDay");
  reasonCodes.push("reasonSameAmount");
  if (vendorScore >= 0.55) reasonCodes.push("reasonSimilarVendor");
  if (sourceScore >= 0.75) reasonCodes.push("reasonSimilarSource");
  if (descriptionScore >= 0.55) reasonCodes.push("reasonSimilarDescription");

  const confidence =
    differenceInDays === 0 && reasonCodes.length >= 4 ? "high" : "medium";

  return {
    confidence,
    id: [primaryTransaction.id, duplicateTransaction.id].join("|"),
    level: confidence === "high" ? "important" : "review",
    reasonCodes: dedupeReasonCodes(reasonCodes),
    first: primaryTransaction,
    second: duplicateTransaction
  };
}

function buildDuplicateCandidates(transactions: Transaction[]) {
  const candidates: DuplicateCandidate[] = [];

  for (let leftIndex = 0; leftIndex < transactions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < transactions.length; rightIndex += 1) {
      const candidate = createDuplicateCandidate(transactions[leftIndex], transactions[rightIndex]);
      if (candidate) candidates.push(candidate);
    }
  }

  return candidates.sort((left, right) => {
    if (left.confidence !== right.confidence) {
      return left.confidence === "high" ? -1 : 1;
    }

    return left.first.date.localeCompare(right.first.date);
  });
}

function receiptStatus(transaction: Transaction) {
  if (transaction.receipt_link) return "Linked";
  if (transaction.receipt_required) return "Missing";
  return "Optional";
}

function issueTypeLabel(issueKey: Exclude<ReconciliationIssueKey, "possibleDuplicates">) {
  const labels: Record<Exclude<ReconciliationIssueKey, "possibleDuplicates">, string> = {
    missingReceipts: "Missing Receipts",
    needsReview: "Needs Review",
    uncategorizedTransactions: "Uncategorized Transactions",
    unreconciledTransactions: "Unreconciled Transactions",
    revenueDeposits: "Revenue Deposits",
    expensePayments: "Expense Payments",
    ownerActivity: "Owner Contributions / Owner Draws",
    internalTransfers: "Internal Transfers",
    taxPackageIssues: "Tax Package Issues"
  };

  return labels[issueKey];
}

function issueRows(issueKey: Exclude<ReconciliationIssueKey, "possibleDuplicates">, issues: TransactionIssue[]) {
  return issues.map((issue) => [
    issueTypeLabel(issueKey),
    issue.level,
    issue.transaction.id,
    issue.transaction.date,
    issue.transaction.vendor,
    issue.transaction.source,
    issue.transaction.category,
    issue.transaction.tax_line,
    signedAmount(issue.transaction),
    receiptStatus(issue.transaction),
    issue.transaction.reconciled ? "Yes" : "No",
    issue.reasonCodes.map((reasonCode) => reconciliationReasonLabels[reasonCode]).join("; "),
    issue.transaction.notes
  ]);
}

function duplicateRows(candidates: DuplicateCandidate[]) {
  return candidates.map((candidate) => [
    candidate.id,
    candidate.confidence,
    candidate.first.id,
    candidate.second.id,
    candidate.first.date,
    candidate.second.date,
    candidate.first.vendor,
    candidate.second.vendor,
    absoluteTransactionAmount(candidate.first),
    candidate.reasonCodes.map((reasonCode) => reconciliationReasonLabels[reasonCode]).join("; ")
  ]);
}

function readinessRows(
  summary: ReconciliationSummary,
  topIssues: ReadinessIssue[]
): CsvRow[] {
  const rows: CsvRow[] = [
    [
      "Monthly readiness score",
      summary.monthlyReadinessScore,
      summary.monthlyReadinessStatus,
      `${summary.unresolvedIssueCount} unresolved issues`
    ]
  ];

  for (const issue of topIssues) {
    rows.push([
      issue.labelKey,
      issue.count,
      issue.level,
      `Deducts ${issue.deduction} points`
    ]);
  }

  return rows;
}

function uniqueCount(issues: TransactionIssue[]) {
  return new Set(issues.map((issue) => issue.transaction.id)).size;
}

export function buildReconciliationData(
  transactions: Transaction[],
  categories: Category[],
  filters: ReconciliationFilters
): ReconciliationData {
  const categoriesByName = categoryMap(categories);
  const filteredTransactions = transactions
    .filter((transaction) => matchesDateFilters(transaction, filters))
    .filter((transaction) =>
      filters.category === "all" ? true : transaction.category === filters.category
    )
    .filter((transaction) => matchesReceiptStatus(transaction, filters.receiptStatus))
    .filter((transaction) =>
      matchesReconciliationStatus(transaction, filters.reconciliationStatus)
    )
    .filter((transaction) => matchesReviewStatus(transaction, filters.reviewStatus))
    .sort((left, right) => right.date.localeCompare(left.date));

  const missingReceipts = filteredTransactions
    .filter((transaction) => isReceiptMissing(transaction))
    .map((transaction) =>
      createTransactionIssue(transaction, "missingReceipts", ["reasonReceiptMissing"], "important")
    );
  const needsReview = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildReviewReasonCodes(transaction);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "needsReview", reasonCodes, "review")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const uncategorizedTransactions = filteredTransactions
    .filter((transaction) => transaction.category === "Uncategorized")
    .map((transaction) =>
      createTransactionIssue(
        transaction,
        "uncategorizedTransactions",
        [
          "reasonUncategorized",
          ...(transaction.tax_line === "Needs review"
            ? (["reasonTaxLineNeedsReview"] satisfies ReasonCode[])
            : [])
        ],
        "important"
      )
    );
  const unreconciledTransactions = filteredTransactions
    .filter((transaction) => !transaction.reconciled)
    .map((transaction) =>
      createTransactionIssue(
        transaction,
        "unreconciledTransactions",
        ["reasonTransactionUnreconciled"],
        "review"
      )
    );
  const revenueDeposits = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildRevenueReasonCodes(transaction, categoriesByName);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "revenueDeposits", reasonCodes, "review")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const expensePayments = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildExpenseReasonCodes(transaction, categoriesByName);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "expensePayments", reasonCodes, "review")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const ownerActivity = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildOwnerReasonCodes(transaction);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "ownerActivity", reasonCodes, "info")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const internalTransfers = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildInternalTransferReasonCodes(transaction);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "internalTransfers", reasonCodes, "info")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const taxPackageIssues = filteredTransactions
    .map((transaction) => {
      const reasonCodes = buildTaxPackageReasonCodes(transaction, categoriesByName);
      return reasonCodes.length > 0
        ? createTransactionIssue(transaction, "taxPackageIssues", reasonCodes, "review")
        : null;
    })
    .filter(Boolean) as TransactionIssue[];
  const duplicateCandidates = buildDuplicateCandidates(filteredTransactions);

  const uncategorizedExpenseCount = filteredTransactions.filter(
    (transaction) => transaction.category === "Uncategorized" && transaction.money_out > 0
  ).length;
  const unclearOwnerTransferCount = uniqueCount([...ownerActivity, ...internalTransfers]);

  const readinessIssues: ReadinessIssue[] = [
    {
      count: missingReceipts.length,
      deduction: Math.min(36, missingReceipts.length * 8),
      key: "missingReceipts",
      labelKey: "missingReceipts",
      level: "important"
    },
    {
      count: needsReview.length,
      deduction: Math.min(30, needsReview.length * 6),
      key: "needsReview",
      labelKey: "needsReview",
      level: "review"
    },
    {
      count: uncategorizedTransactions.length,
      deduction: Math.min(30, uncategorizedTransactions.length * 8),
      key: "uncategorizedTransactions",
      labelKey: "uncategorizedTransactions",
      level: "important"
    },
    {
      count: unreconciledTransactions.length,
      deduction: Math.min(20, unreconciledTransactions.length * 3),
      key: "unreconciledTransactions",
      labelKey: "unreconciledTransactions",
      level: "review"
    },
    {
      count: duplicateCandidates.length,
      deduction: Math.min(18, duplicateCandidates.length * 6),
      key: "possibleDuplicates",
      labelKey: "possibleDuplicates",
      level: "review"
    },
    {
      count: uncategorizedExpenseCount,
      deduction: Math.min(18, uncategorizedExpenseCount * 6),
      key: "uncategorizedExpenses",
      labelKey: "uncategorizedExpenses",
      level: "important"
    },
    {
      count: unclearOwnerTransferCount,
      deduction: Math.min(12, unclearOwnerTransferCount * 4),
      key: "unclearOwnerTransfers",
      labelKey: "ownerTransfersNeedingReview",
      level: "review"
    }
  ];
  const scoreDeduction = readinessIssues.reduce((total, issue) => total + issue.deduction, 0);
  const monthlyReadinessScore = Math.max(0, 100 - scoreDeduction);
  const monthlyReadinessStatus =
    monthlyReadinessScore >= 90
      ? "ready"
      : monthlyReadinessScore >= 70
        ? "needsReview"
        : "notReady";
  const topIssues = readinessIssues
    .filter((issue) => issue.count > 0)
    .sort((left, right) => right.deduction - left.deduction || right.count - left.count)
    .slice(0, 5);
  const unresolvedIssueCount =
    missingReceipts.length +
    needsReview.length +
    uncategorizedTransactions.length +
    unreconciledTransactions.length +
    duplicateCandidates.length +
    revenueDeposits.length +
    expensePayments.length +
    unclearOwnerTransferCount +
    taxPackageIssues.length;

  const summary: ReconciliationSummary = {
    expensePaymentsNeedingReceipts: expensePayments.length,
    missingReceipts: missingReceipts.length,
    monthlyReadinessScore,
    monthlyReadinessStatus,
    needsReview: needsReview.length,
    ownerTransfersNeedingReview: unclearOwnerTransferCount,
    possibleDuplicates: duplicateCandidates.length,
    revenueDepositsNeedingReview: revenueDeposits.length,
    topIssueCount: topIssues.length,
    totalTransactions: filteredTransactions.length,
    uncategorizedTransactions: uncategorizedTransactions.length,
    unresolvedIssueCount,
    unreconciledTransactions: unreconciledTransactions.length
  };

  const allIssueRows = [
    ...issueRows("missingReceipts", missingReceipts),
    ...issueRows("needsReview", needsReview),
    ...issueRows("uncategorizedTransactions", uncategorizedTransactions),
    ...issueRows("unreconciledTransactions", unreconciledTransactions),
    ...issueRows("revenueDeposits", revenueDeposits),
    ...issueRows("expensePayments", expensePayments),
    ...issueRows("ownerActivity", ownerActivity),
    ...issueRows("internalTransfers", internalTransfers),
    ...issueRows("taxPackageIssues", taxPackageIssues)
  ];
  const monthOptions = Array.from(new Set(transactions.map((transaction) => monthKey(transaction))))
    .sort()
    .reverse();

  return {
    allIssueRows,
    duplicateCandidates,
    duplicateRows: duplicateRows(duplicateCandidates),
    expensePayments,
    filteredTransactions,
    internalTransfers,
    missingReceipts,
    monthOptions,
    needsReview,
    ownerActivity,
    readinessChecklistRows: readinessRows(summary, topIssues),
    revenueDeposits,
    summary,
    taxPackageIssues,
    topIssues,
    uncategorizedExpenseCount,
    uncategorizedTransactions,
    unclearOwnerTransferCount,
    unreconciledTransactions
  };
}

export function sectionVisible(
  currentFilter: ReconciliationIssueFilter,
  sectionKey: ReconciliationIssueKey
) {
  return currentFilter === "all" || currentFilter === sectionKey;
}

export function reasonLabel(reasonCode: ReasonCode) {
  return reconciliationReasonLabels[reasonCode];
}

export function duplicateReasonLabel(reasonCode: ReasonCode) {
  return duplicateReasonCodes.has(reasonCode)
    ? reconciliationReasonLabels[reasonCode]
    : reconciliationReasonLabels[reasonCode];
}
