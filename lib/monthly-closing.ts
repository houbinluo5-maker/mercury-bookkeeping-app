import {
  filterByMonth,
  summarizeTransactions
} from "@/lib/calculations";
import {
  buildReconciliationData,
  type ReconciliationIssueFilter
} from "@/lib/reconciliation";
import type {
  AuditLog,
  Category,
  MonthlyClosing,
  MonthlyClosingStatus,
  MonthlyClosingSummaryJson,
  Transaction,
  TransactionDraft
} from "@/lib/types";

export const closingReadinessThreshold = 90;
export const monthlyClosingsStorageKey = "mercury-bookkeeping-monthly-closings";

export const closingSensitiveFields: Array<keyof TransactionDraft> = [
  "date",
  "money_in",
  "money_out",
  "category",
  "tax_line",
  "receipt_required",
  "receipt_link",
  "reconciled",
  "source",
  "vendor",
  "description",
  "notes"
];

export type MonthlyClosingCard = {
  auditLogCount: number;
  closedPeriodChangeCount: number;
  closing: MonthlyClosing;
  expenses: number;
  missingReceiptsCount: number;
  needsReviewCount: number;
  netIncome: number;
  possibleDuplicatesCount: number;
  revenue: number;
  totalTransactions: number;
  uncategorizedCount: number;
  unreconciledCount: number;
};

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

export function monthlyClosingId(year: number, month: number) {
  return `closing-${year}-${padMonth(month)}`;
}

export function monthPeriod(year: number, month: number) {
  const periodStart = `${year}-${padMonth(month)}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return { periodEnd, periodStart };
}

export function dateInPeriod(date: string, closing: Pick<MonthlyClosing, "period_start" | "period_end">) {
  return date >= closing.period_start && date <= closing.period_end;
}

export function normalizeMonthlyClosing(input: Partial<MonthlyClosing>): MonthlyClosing {
  const year = Number(input.year ?? new Date().getFullYear());
  const month = Number(input.month ?? 1);
  const { periodEnd, periodStart } = monthPeriod(year, month);
  const now = new Date().toISOString();

  return {
    id: input.id || monthlyClosingId(year, month),
    year,
    month,
    period_start: input.period_start || periodStart,
    period_end: input.period_end || periodEnd,
    status: input.status ?? "open",
    readiness_score: Number(input.readiness_score ?? 0),
    closed_at: input.closed_at ?? null,
    closed_by: input.closed_by ?? null,
    reopened_at: input.reopened_at ?? null,
    reopened_by: input.reopened_by ?? null,
    close_reason: input.close_reason ?? "",
    reopen_reason: input.reopen_reason ?? "",
    summary_json: normalizeSummary(input.summary_json),
    created_at: input.created_at || now,
    updated_at: input.updated_at || now
  };
}

export function normalizeMonthlyClosings(input: unknown): MonthlyClosing[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => normalizeMonthlyClosing((item ?? {}) as Partial<MonthlyClosing>))
    .sort((left, right) => right.period_start.localeCompare(left.period_start));
}

function normalizeSummary(input: unknown): MonthlyClosingSummaryJson {
  const value = typeof input === "object" && input !== null ? input as Partial<MonthlyClosingSummaryJson> : {};

  return {
    audit_log_count: Number(value.audit_log_count ?? 0),
    backup_exported: Boolean(value.backup_exported ?? false),
    checklist: typeof value.checklist === "object" && value.checklist !== null ? value.checklist : {},
    closed_period_change_count: Number(value.closed_period_change_count ?? 0),
    expenses: Number(value.expenses ?? 0),
    missing_receipts_count: Number(value.missing_receipts_count ?? 0),
    needs_review_count: Number(value.needs_review_count ?? 0),
    net_income: Number(value.net_income ?? 0),
    possible_duplicates_count: Number(value.possible_duplicates_count ?? 0),
    revenue: Number(value.revenue ?? 0),
    total_transactions: Number(value.total_transactions ?? 0),
    uncategorized_count: Number(value.uncategorized_count ?? 0),
    unreconciled_count: Number(value.unreconciled_count ?? 0)
  };
}

function defaultClosing(year: number, month: number, readinessScore = 0): MonthlyClosing {
  const { periodEnd, periodStart } = monthPeriod(year, month);
  const now = new Date().toISOString();
  const status: MonthlyClosingStatus =
    readinessScore >= closingReadinessThreshold ? "ready_to_close" : "open";

  return {
    id: monthlyClosingId(year, month),
    year,
    month,
    period_start: periodStart,
    period_end: periodEnd,
    status,
    readiness_score: readinessScore,
    closed_at: null,
    closed_by: null,
    reopened_at: null,
    reopened_by: null,
    close_reason: "",
    reopen_reason: "",
    summary_json: normalizeSummary({ readiness_score: readinessScore }),
    created_at: now,
    updated_at: now
  };
}

export function findClosingForDate(monthlyClosings: MonthlyClosing[], date: string) {
  return monthlyClosings.find((closing) => dateInPeriod(date, closing));
}

export function isDateInClosedPeriod(monthlyClosings: MonthlyClosing[], date: string) {
  return findClosingForDate(monthlyClosings, date)?.status === "closed";
}

export function changedSensitiveFields(patch: Partial<TransactionDraft>) {
  return closingSensitiveFields.filter((field) => field in patch);
}

export function requiresClosedPeriodReason(
  monthlyClosings: MonthlyClosing[],
  transaction: Transaction,
  patch: Partial<TransactionDraft>
) {
  const sensitiveFields = changedSensitiveFields(patch);

  if (!sensitiveFields.length) return false;
  if (isDateInClosedPeriod(monthlyClosings, transaction.date)) return true;
  if (typeof patch.date === "string" && isDateInClosedPeriod(monthlyClosings, patch.date)) {
    return true;
  }

  return false;
}

export function closedPeriodChangeCount(closing: MonthlyClosing, auditLogs: AuditLog[]) {
  if (!closing.closed_at) return 0;

  return auditLogs.filter(
    (entry) =>
      entry.created_at > closing.closed_at! &&
      entry.entity_type !== "reconciliation" &&
      Boolean(entry.reason)
  ).length;
}

export function buildClosingSummary(
  transactions: Transaction[],
  categories: Category[],
  auditLogs: AuditLog[],
  year: number,
  month: number,
  checklist: Record<string, boolean> = {}
): MonthlyClosingSummaryJson {
  const monthTransactions = filterByMonth(transactions, year, month);
  const summary = summarizeTransactions(monthTransactions);
  const { periodEnd, periodStart } = monthPeriod(year, month);
  const reconciliation = buildReconciliationData(monthTransactions, categories, {
    category: "all",
    endDate: periodEnd,
    issueType: "all" satisfies ReconciliationIssueFilter,
    month: "all",
    receiptStatus: "all",
    reconciliationStatus: "all",
    reviewStatus: "all",
    startDate: periodStart
  });

  return {
    audit_log_count: auditLogs.filter(
      (entry) => entry.created_at.slice(0, 7) === `${year}-${padMonth(month)}`
    ).length,
    backup_exported: Boolean(checklist.backup_exported),
    checklist,
    closed_period_change_count: 0,
    expenses: summary.expenses + summary.cogs,
    missing_receipts_count: reconciliation.summary.missingReceipts,
    needs_review_count: reconciliation.summary.needsReview,
    net_income: summary.net_income,
    possible_duplicates_count: reconciliation.summary.possibleDuplicates,
    revenue: summary.revenue,
    total_transactions: monthTransactions.length,
    uncategorized_count: reconciliation.summary.uncategorizedTransactions,
    unreconciled_count: reconciliation.summary.unreconciledTransactions
  };
}

export function buildMonthlyClosingCards(
  transactions: Transaction[],
  categories: Category[],
  auditLogs: AuditLog[],
  monthlyClosings: MonthlyClosing[],
  year: number
): MonthlyClosingCard[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthTransactions = filterByMonth(transactions, year, month);
    const summary = summarizeTransactions(monthTransactions);
    const { periodEnd, periodStart } = monthPeriod(year, month);
    const reconciliation = buildReconciliationData(monthTransactions, categories, {
      category: "all",
      endDate: periodEnd,
      issueType: "all",
      month: "all",
      receiptStatus: "all",
      reconciliationStatus: "all",
      reviewStatus: "all",
      startDate: periodStart
    });
    const existing = monthlyClosings.find((closing) => closing.year === year && closing.month === month);
    const closing = existing
      ? normalizeMonthlyClosing({
          ...existing,
          readiness_score: existing.status === "closed" || existing.status === "reopened"
            ? existing.readiness_score
            : reconciliation.summary.monthlyReadinessScore
        })
      : defaultClosing(year, month, reconciliation.summary.monthlyReadinessScore);
    const changeCount = closedPeriodChangeCount(closing, auditLogs);

    return {
      auditLogCount: auditLogs.filter((entry) => dateInPeriod(entry.created_at.slice(0, 10), closing)).length,
      closedPeriodChangeCount: changeCount,
      closing: {
        ...closing,
        summary_json: {
          ...closing.summary_json,
          closed_period_change_count: changeCount
        }
      },
      expenses: summary.expenses + summary.cogs,
      missingReceiptsCount: reconciliation.summary.missingReceipts,
      needsReviewCount: reconciliation.summary.needsReview,
      netIncome: summary.net_income,
      possibleDuplicatesCount: reconciliation.summary.possibleDuplicates,
      revenue: summary.revenue,
      totalTransactions: monthTransactions.length,
      uncategorizedCount: reconciliation.summary.uncategorizedTransactions,
      unreconciledCount: reconciliation.summary.unreconciledTransactions
    };
  });
}

export function closingStatusTone(status: MonthlyClosingStatus) {
  if (status === "closed") return "green";
  if (status === "ready_to_close") return "blue";
  if (status === "reopened") return "amber";
  return "neutral";
}
