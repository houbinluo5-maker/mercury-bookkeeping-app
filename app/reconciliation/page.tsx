"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Edit3, Trash2 } from "lucide-react";
import { AuditHistoryPanel } from "@/components/audit-history-panel";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { ReceiptUploadControl } from "@/components/receipt-upload-control";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { AlertBanner, FilterBar, SectionHeader } from "@/components/ui-primitives";
import { promptOptionalAuditReason, promptRequiredAuditReason } from "@/lib/audit-reason";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  appendDuplicateIgnoreTag,
  appendReviewResolvedTag,
  buildReconciliationData,
  clearReviewSignals,
  duplicateCandidateHeaders,
  readinessChecklistHeaders,
  reasonLabel,
  reconciliationIssueHeaders,
  sectionVisible,
  type DuplicateCandidate,
  type IssueLevel,
  type ReconciliationIssueFilter,
  type ReviewStatusFilter,
  type TransactionIssue
} from "@/lib/reconciliation";
import { downloadCsv } from "@/lib/tax-package";
import { isDateInClosedPeriod } from "@/lib/monthly-closing";
import { useBookkeeping } from "@/lib/storage";
import type { AuditLog, Category, Transaction, TransactionDraft } from "@/lib/types";

function defaultYearStart(year: number) {
  return `${year}-01-01`;
}

function defaultYearEnd(year: number) {
  return `${year}-12-31`;
}

function exportPrefix(startDate: string, endDate: string, month: string) {
  return month === "all"
    ? `reconciliation-${startDate}-to-${endDate}`
    : `reconciliation-${month}`;
}

function monthLabel(value: string, language: "en" | "zh") {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function amountText(transaction: Transaction) {
  return formatCurrency(transaction.money_in || transaction.money_out, transaction.currency);
}

function IssueLevelBadge({ level, label }: { level: IssueLevel; label: string }) {
  const toneByLevel = {
    info: "blue",
    review: "amber",
    important: "red"
  } as const;

  return <Badge tone={toneByLevel[level]}>{label}</Badge>;
}

function ReceiptStatusBadge({
  transaction,
  t
}: {
  transaction: Transaction;
  t: (key: string) => string;
}) {
  if (transaction.receipt_link) return <Badge tone="green">{t("receiptLinked")}</Badge>;
  if (transaction.receipt_required) return <Badge tone="red">{t("receiptMissing")}</Badge>;
  return <Badge tone="neutral">{t("receiptOptional")}</Badge>;
}

function ReconciliationStatusBadge({
  transaction,
  t
}: {
  transaction: Transaction;
  t: (key: string) => string;
}) {
  return (
    <Badge tone={transaction.reconciled ? "green" : "amber"}>
      {transaction.reconciled ? t("reconciled") : t("unreconciled")}
    </Badge>
  );
}

function ReasonList({
  reasons,
  t
}: {
  reasons: string[];
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-1">
      {reasons.map((reason) => (
        <p className="text-sm text-slate-600" key={reason}>
          {t(reason)}
        </p>
      ))}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-6 text-sm text-slate-500">
      {label}
    </div>
  );
}

function TransactionIssueRow({
  auditEntries,
  categoryLabel,
  categories,
  closedPeriod,
  issue,
  onAddNote,
  onCategoryChange,
  onMarkReceiptNotRequired,
  onMarkReconciled,
  onOpenTransaction,
  onReceiptLinkChange,
  onResolveReview,
  readOnly = false,
  showCategorySelect = false,
  showReceiptUpload = false,
  showResolveReview = false,
  t,
  taxLineLabel
}: {
  auditEntries: AuditLog[];
  categoryLabel: (value: string) => string;
  categories: Category[];
  closedPeriod: boolean;
  issue: TransactionIssue;
  onAddNote: (transaction: Transaction) => void;
  onCategoryChange: (transaction: Transaction, categoryName: string) => void;
  onMarkReceiptNotRequired?: (transaction: Transaction) => void;
  onMarkReconciled?: (transaction: Transaction) => void;
  onOpenTransaction: (transaction: Transaction) => void;
  onReceiptLinkChange?: (
    transaction: Transaction,
    receiptLink: string,
    audit?: {
      action?: "delete_receipt" | "replace_receipt" | "upload_receipt";
      reason?: string;
      source?: "receipt_upload";
    }
  ) => void;
  onResolveReview?: (transaction: Transaction) => void;
  readOnly?: boolean;
  showCategorySelect?: boolean;
  showReceiptUpload?: boolean;
  showResolveReview?: boolean;
  t: (key: string) => string;
  taxLineLabel: (value: string) => string;
}) {
  return (
    <article className="rounded-md border border-line px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">
              {issue.transaction.vendor || t("manualEntry")}
            </p>
            <IssueLevelBadge label={t(issue.level)} level={issue.level} />
            <ReceiptStatusBadge t={t} transaction={issue.transaction} />
            <ReconciliationStatusBadge t={t} transaction={issue.transaction} />
            {closedPeriod ? <Badge tone="red">{t("closedPeriod")}</Badge> : null}
          </div>
          <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
            <p>
              {formatDate(issue.transaction.date)} - {amountText(issue.transaction)}
            </p>
            <p>
              {t("source")}: {issue.transaction.source}
            </p>
            <p>{categoryLabel(issue.transaction.category)}</p>
            <p>{taxLineLabel(issue.transaction.tax_line)}</p>
          </div>
          {issue.transaction.description ? (
            <p className="text-sm text-slate-700">{issue.transaction.description}</p>
          ) : null}
          <ReasonList reasons={issue.reasonCodes} t={t} />
          {issue.transaction.notes ? (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {issue.transaction.notes}
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-xl space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onOpenTransaction(issue.transaction)}>
              <Edit3 aria-hidden="true" className="h-4 w-4" />
              {t("openTransaction")}
            </Button>
            {onMarkReconciled && !issue.transaction.reconciled ? (
              <Button disabled={readOnly} onClick={() => onMarkReconciled(issue.transaction)}>
                {t("markReconciled")}
              </Button>
            ) : null}
            {onMarkReceiptNotRequired && issue.transaction.receipt_required ? (
              <Button disabled={readOnly} onClick={() => onMarkReceiptNotRequired(issue.transaction)}>
                {t("markReceiptNotRequired")}
              </Button>
            ) : null}
            {showResolveReview && onResolveReview ? (
              <Button disabled={readOnly} onClick={() => onResolveReview(issue.transaction)}>
                {t("markReviewResolved")}
              </Button>
            ) : null}
            <Button disabled={readOnly} onClick={() => onAddNote(issue.transaction)}>{t("addNote")}</Button>
          </div>
          {showCategorySelect ? (
            <label className="block space-y-1">
              <span className="form-label">{t("updateCategory")}</span>
              <select
                className="form-input"
                disabled={readOnly}
                onChange={(event) => onCategoryChange(issue.transaction, event.target.value)}
                value={issue.transaction.category}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {categoryLabel(category.name)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {showReceiptUpload ? (
            <div className="rounded-md border border-dashed border-line p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">{t("uploadReceipt")}</p>
              <ReceiptUploadControl
                compact
                onReceiptLinkChange={(receiptLink, audit) =>
                  onReceiptLinkChange?.(issue.transaction, receiptLink, audit)
                }
                receiptLink={issue.transaction.receipt_link}
                receiptRequired={issue.transaction.receipt_required}
                readOnly={readOnly}
                transactionId={issue.transaction.id}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-marine">
            {t("auditHistory")}
          </summary>
          <div className="mt-3">
            <AuditHistoryPanel emptyLabel={t("noAuditEntries")} entries={auditEntries} limit={6} />
          </div>
        </details>
      </div>
    </article>
  );
}

function DuplicateCandidateRow({
  auditEntries,
  candidate,
  onDeleteDuplicate,
  onMarkNotDuplicate,
  onOpenTransaction,
  readOnly = false,
  t
}: {
  auditEntries: AuditLog[];
  candidate: DuplicateCandidate;
  onDeleteDuplicate: (candidate: DuplicateCandidate) => void;
  onMarkNotDuplicate: (candidate: DuplicateCandidate) => void;
  onOpenTransaction: (transaction: Transaction) => void;
  readOnly?: boolean;
  t: (key: string) => string;
}) {
  return (
    <article className="rounded-md border border-line px-4 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <IssueLevelBadge
            label={candidate.confidence === "high" ? t("highConfidence") : t("mediumConfidence")}
            level={candidate.level}
          />
          <Badge tone="neutral">{t("possibleDuplicate")}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{t("transaction")} A</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {candidate.first.vendor || t("manualEntry")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(candidate.first.date)} - {amountText(candidate.first)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{candidate.first.description}</p>
            <div className="mt-3">
              <Button onClick={() => onOpenTransaction(candidate.first)}>{t("openTransaction")}</Button>
            </div>
          </div>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase text-slate-500">{t("transaction")} B</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {candidate.second.vendor || t("manualEntry")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(candidate.second.date)} - {amountText(candidate.second)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{candidate.second.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => onOpenTransaction(candidate.second)}>{t("openTransaction")}</Button>
              <Button disabled={readOnly} onClick={() => onDeleteDuplicate(candidate)} variant="danger">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {t("deleteDuplicate")}
              </Button>
            </div>
          </div>
        </div>
        <ReasonList reasons={candidate.reasonCodes} t={t} />
        <div>
          <Button disabled={readOnly} onClick={() => onMarkNotDuplicate(candidate)}>{t("markNotDuplicate")}</Button>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-marine">
            {t("auditHistory")}
          </summary>
          <div className="mt-3">
            <AuditHistoryPanel emptyLabel={t("noAuditEntries")} entries={auditEntries} limit={8} />
          </div>
        </details>
      </div>
    </article>
  );
}

function IssueSection({
  children,
  count,
  title,
  tone = "neutral"
}: {
  children: React.ReactNode;
  count: number;
  title: string;
  tone?: "neutral" | "blue" | "amber" | "red";
}) {
  const toneClasses = {
    neutral: "border-line",
    blue: "border-sky-200",
    amber: "border-amber-200",
    red: "border-red-200"
  };

  return (
    <section className={`surface-card space-y-3 p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        <Badge tone={tone === "neutral" ? "blue" : tone}>{String(count)}</Badge>
      </div>
      {children}
    </section>
  );
}

export default function ReconciliationPage() {
  const {
    auditLogs,
    bulkUpdateTransactions,
    categories,
    deleteTransaction,
    monthlyClosings,
    permissions,
    settings,
    transactions,
    updateTransaction
  } = useBookkeeping();
  const { categoryLabel, t, taxLineLabel } = useI18n();
  const [startDate, setStartDate] = useState(defaultYearStart(settings.tax_year));
  const [endDate, setEndDate] = useState(defaultYearEnd(settings.tax_year));
  const [month, setMonth] = useState("all");
  const [category, setCategory] = useState("all");
  const [issueType, setIssueType] = useState<ReconciliationIssueFilter>("all");
  const [receiptStatus, setReceiptStatus] = useState<
    "all" | "missing" | "linked" | "required" | "optional"
  >("all");
  const [reconciliationStatus, setReconciliationStatus] = useState<
    "all" | "reconciled" | "unreconciled"
  >("all");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>("all");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      category,
      endDate,
      issueType,
      month,
      receiptStatus,
      reconciliationStatus,
      reviewStatus,
      startDate
    }),
    [
      category,
      endDate,
      issueType,
      month,
      receiptStatus,
      reconciliationStatus,
      reviewStatus,
      startDate
    ]
  );
  const reconciliationData = useMemo(
    () => buildReconciliationData(transactions, categories, filters),
    [categories, filters, transactions]
  );
  const editingTransaction =
    transactions.find((transaction) => transaction.id === editingTransactionId) ?? null;
  const currentPrefix = exportPrefix(startDate, endDate, month);
  const categoriesByName = useMemo(
    () => new Map(categories.map((item) => [item.name, item])),
    [categories]
  );
  const reconciliationReadOnly = !permissions.canRunReconciliation;

  function promptReasonForTransaction(transaction: Transaction, labelKey: string) {
    return isDateInClosedPeriod(monthlyClosings, transaction.date)
      ? promptRequiredAuditReason(t, t(labelKey))
      : promptOptionalAuditReason(t, t(labelKey));
  }

  function updateCategory(transaction: Transaction, categoryName: string) {
    if (reconciliationReadOnly) return;

    const reason = promptReasonForTransaction(transaction, "category");

    if (reason === null) return;

    const nextCategory = categoriesByName.get(categoryName);
    const patch: Partial<TransactionDraft> = {
      category: categoryName,
      tax_line: nextCategory?.tax_line ?? transaction.tax_line
    };

    if (
      nextCategory &&
      nextCategory.receipt_required_default !== transaction.receipt_required &&
      window.confirm(
        t("updateReceiptRequirementQuestion")
          .replace("{category}", categoryLabel(nextCategory.name))
          .replace(
            "{default}",
            nextCategory.receipt_required_default ? t("required") : t("optional")
          )
      )
    ) {
      patch.receipt_required = nextCategory.receipt_required_default;
    }

    updateTransaction(transaction.id, patch, {
      reason,
      source: "manual"
    });
  }

  function addNote(transaction: Transaction) {
    if (reconciliationReadOnly) return;

    const nextNotes = window.prompt(t("editNotePrompt"), transaction.notes);
    if (nextNotes === null) return;
    const reason = isDateInClosedPeriod(monthlyClosings, transaction.date)
      ? promptRequiredAuditReason(t, t("notes"))
      : "";
    if (reason === null) return;
    updateTransaction(
      transaction.id,
      { notes: nextNotes },
      {
        actionsByField: { notes: "note_change" },
        entityTypesByField: { notes: "reconciliation" },
        reason,
        source: "manual"
      }
    );
  }

  function markReceiptNotRequired(transaction: Transaction) {
    if (reconciliationReadOnly) return;

    const reason = promptReasonForTransaction(transaction, "markReceiptNotRequired");

    if (reason === null) return;

    updateTransaction(
      transaction.id,
      { receipt_required: false },
      {
        reason,
        source: "manual"
      }
    );
  }

  function markReconciled(transaction: Transaction) {
    if (reconciliationReadOnly) return;

    const reason = promptReasonForTransaction(transaction, "markReconciled");

    if (reason === null) return;

    updateTransaction(
      transaction.id,
      { reconciled: true },
      {
        reason,
        source: "manual"
      }
    );
  }

  function markReviewResolved(transaction: Transaction) {
    if (reconciliationReadOnly) return;

    const reason = isDateInClosedPeriod(monthlyClosings, transaction.date)
      ? promptRequiredAuditReason(t, t("markReviewResolved"))
      : "";
    if (reason === null) return;
    const nextCategory = categoriesByName.get(transaction.category);
    const patch: Partial<TransactionDraft> = {
      notes: appendReviewResolvedTag(clearReviewSignals(transaction.notes))
    };

    if (transaction.tax_line === "Needs review" && nextCategory?.tax_line !== "Needs review") {
      patch.tax_line = nextCategory?.tax_line ?? transaction.tax_line;
    }

    updateTransaction(transaction.id, patch, {
      extraEntries: [
        {
          action: "resolve_review",
          entity_id: transaction.id,
          entity_type: "reconciliation",
          field_name: "review_status",
          new_value: "resolved",
          old_value: "needs review",
          source: "manual"
        }
      ],
      reason,
      source: "manual"
    });
  }

  function updateReceiptLink(
    transaction: Transaction,
    receiptLink: string,
    audit?: { action?: "delete_receipt" | "replace_receipt" | "upload_receipt"; reason?: string; source?: "receipt_upload" }
  ) {
    if (reconciliationReadOnly) return;

    const reason = isDateInClosedPeriod(monthlyClosings, transaction.date)
      ? audit?.reason || promptRequiredAuditReason(t, t("receiptLink"))
      : audit?.reason;
    if (reason === null) return;
    updateTransaction(
      transaction.id,
      { receipt_link: receiptLink },
      {
        actionsByField: audit?.action ? { receipt_link: audit.action } : undefined,
        reason,
        source: audit?.source ?? "receipt_upload"
      }
    );
  }

  function markNotDuplicate(candidate: DuplicateCandidate) {
    if (reconciliationReadOnly) return;

    bulkUpdateTransactions([
      {
        id: candidate.first.id,
        transaction: {
          notes: appendDuplicateIgnoreTag(
            candidate.first.notes,
            candidate.first.id,
            candidate.second.id
          )
        },
        audit: {
          actionsByField: { notes: "note_change" },
          entityTypesByField: { notes: "reconciliation" },
          extraEntries: [
            {
              action: "dismiss_duplicate",
              entity_id: candidate.first.id,
              entity_type: "reconciliation",
              field_name: "duplicate_status",
              new_value: "dismissed",
              old_value: "possible_duplicate",
              source: "manual"
            }
          ],
          source: "manual"
        }
      },
      {
        id: candidate.second.id,
        transaction: {
          notes: appendDuplicateIgnoreTag(
            candidate.second.notes,
            candidate.first.id,
            candidate.second.id
          )
        },
        audit: {
          actionsByField: { notes: "note_change" },
          entityTypesByField: { notes: "reconciliation" },
          extraEntries: [
            {
              action: "dismiss_duplicate",
              entity_id: candidate.second.id,
              entity_type: "reconciliation",
              field_name: "duplicate_status",
              new_value: "dismissed",
              old_value: "possible_duplicate",
              source: "manual"
            }
          ],
          source: "manual"
        }
      }
    ]);
  }

  function deleteDuplicate(candidate: DuplicateCandidate) {
    if (reconciliationReadOnly) return;

    if (
      window.confirm(
        t("deleteDuplicateQuestion").replace(
          "{transaction}",
          candidate.second.vendor || candidate.second.id
        )
      )
    ) {
      const reason = isDateInClosedPeriod(monthlyClosings, candidate.second.date)
        ? promptRequiredAuditReason(t, t("deleteDuplicate"))
        : promptOptionalAuditReason(t, t("deleteDuplicate"));

      if (reason === null) return;

      deleteTransaction(candidate.second.id, { reason, source: "manual" });
    }
  }

  const summaryCards = [
    ["totalTransactions", String(reconciliationData.summary.totalTransactions), "blue"],
    ["unreconciledTransactions", String(reconciliationData.summary.unreconciledTransactions), reconciliationData.summary.unreconciledTransactions ? "amber" : "green"],
    ["missingReceipts", String(reconciliationData.summary.missingReceipts), reconciliationData.summary.missingReceipts ? "red" : "green"],
    ["needsReview", String(reconciliationData.summary.needsReview), reconciliationData.summary.needsReview ? "amber" : "green"],
    ["uncategorizedTransactions", String(reconciliationData.summary.uncategorizedTransactions), reconciliationData.summary.uncategorizedTransactions ? "red" : "green"],
    ["possibleDuplicates", String(reconciliationData.summary.possibleDuplicates), reconciliationData.summary.possibleDuplicates ? "amber" : "green"],
    ["revenueDepositsNeedingReview", String(reconciliationData.summary.revenueDepositsNeedingReview), reconciliationData.summary.revenueDepositsNeedingReview ? "amber" : "green"],
    ["expensePaymentsNeedingReceipts", String(reconciliationData.summary.expensePaymentsNeedingReceipts), reconciliationData.summary.expensePaymentsNeedingReceipts ? "red" : "green"],
    ["ownerTransfersNeedingReview", String(reconciliationData.summary.ownerTransfersNeedingReview), reconciliationData.summary.ownerTransfersNeedingReview ? "amber" : "green"],
    [
      "monthlyReadinessScore",
      String(reconciliationData.summary.monthlyReadinessScore),
      reconciliationData.summary.monthlyReadinessStatus === "ready"
        ? "green"
        : reconciliationData.summary.monthlyReadinessStatus === "needsReview"
          ? "amber"
          : "red"
    ]
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${settings.entity_type} - ${t(reconciliationData.summary.monthlyReadinessStatus)}`}
        description={t("reconciliationPageDescription")}
        title={t("reconciliationCenter")}
      />

      <AlertBanner icon={<AlertTriangle aria-hidden="true" className="h-5 w-5 text-amber-700" />} tone="warning">
        <p>{t("reconciliationCenterHelp")}</p>
      </AlertBanner>

      {reconciliationReadOnly ? <PermissionNotice detailKey="permissionRequiredOwnerAdmin" /> : null}

      <FilterBar>
        <SectionHeader description={t("reconciliationFilterHelp")} title={t("reviewScope")} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="form-label">{t("startDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("endDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("month")}</span>
            <select className="form-input" onChange={(event) => setMonth(event.target.value)} value={month}>
              <option value="all">{t("allMonths")}</option>
              {reconciliationData.monthOptions.map((option) => (
                <option key={option} value={option}>
                  {monthLabel(option, settings.language)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("category")}</span>
            <select className="form-input" onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="all">{t("allCategories")}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {categoryLabel(item.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("issueType")}</span>
            <select
              className="form-input"
              onChange={(event) => setIssueType(event.target.value as ReconciliationIssueFilter)}
              value={issueType}
            >
              <option value="all">{t("allIssueTypes")}</option>
              <option value="missingReceipts">{t("missingReceipts")}</option>
              <option value="needsReview">{t("needsReview")}</option>
              <option value="uncategorizedTransactions">{t("uncategorizedTransactions")}</option>
              <option value="unreconciledTransactions">{t("unreconciledTransactions")}</option>
              <option value="possibleDuplicates">{t("possibleDuplicates")}</option>
              <option value="revenueDeposits">{t("revenueDeposits")}</option>
              <option value="expensePayments">{t("expensePayments")}</option>
              <option value="ownerActivity">{t("ownerContributionsOwnerDraws")}</option>
              <option value="internalTransfers">{t("internalTransfers")}</option>
              <option value="taxPackageIssues">{t("taxPackageIssues")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("receiptStatus")}</span>
            <select
              className="form-input"
              onChange={(event) => setReceiptStatus(event.target.value as typeof receiptStatus)}
              value={receiptStatus}
            >
              <option value="all">{t("allReceiptStatuses")}</option>
              <option value="missing">{t("receiptMissing")}</option>
              <option value="linked">{t("receiptLinked")}</option>
              <option value="required">{t("receiptRequired")}</option>
              <option value="optional">{t("receiptOptional")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("reconciliationStatus")}</span>
            <select
              className="form-input"
              onChange={(event) =>
                setReconciliationStatus(event.target.value as typeof reconciliationStatus)
              }
              value={reconciliationStatus}
            >
              <option value="all">{t("allReconciliationStatuses")}</option>
              <option value="reconciled">{t("reconciled")}</option>
              <option value="unreconciled">{t("unreconciled")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("reviewStatus")}</span>
            <select
              className="form-input"
              onChange={(event) => setReviewStatus(event.target.value as ReviewStatusFilter)}
              value={reviewStatus}
            >
              <option value="all">{t("allReviewStatuses")}</option>
              <option value="needsReview">{t("needsReviewOnly")}</option>
              <option value="clean">{t("noNeedsReview")}</option>
            </select>
          </label>
        </div>
      </FilterBar>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(([labelKey, value, tone]) => (
          <MetricCard
            detail={
              labelKey === "monthlyReadinessScore"
                ? t(reconciliationData.summary.monthlyReadinessStatus)
                : undefined
            }
            key={labelKey}
            label={t(labelKey)}
            tone={tone}
            value={value}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">{t("monthlyReadinessScore")}</h2>
              <p className="section-subtitle">{t("monthlyReadinessSummary")}</p>
            </div>
            <IssueLevelBadge
              label={t(reconciliationData.summary.monthlyReadinessStatus)}
              level={
                reconciliationData.summary.monthlyReadinessStatus === "ready"
                  ? "info"
                  : reconciliationData.summary.monthlyReadinessStatus === "needsReview"
                    ? "review"
                    : "important"
              }
            />
          </div>
          <div className="mt-4 flex items-end gap-4">
            <p className="text-4xl font-semibold text-ink">
              {reconciliationData.summary.monthlyReadinessScore}
            </p>
            <p className="pb-1 text-sm text-slate-500">
              {reconciliationData.summary.unresolvedIssueCount} {t("unresolvedIssues")}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {reconciliationData.topIssues.length ? (
              reconciliationData.topIssues.map((issue) => (
                <div
                  className="flex items-center justify-between rounded-md border border-line px-3 py-2"
                  key={issue.key}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{t(issue.labelKey)}</p>
                    <p className="text-xs text-slate-500">
                      {issue.count} {t("transactions")}
                    </p>
                  </div>
                  <IssueLevelBadge label={`-${issue.deduction}`} level={issue.level} />
                </div>
              ))
            ) : (
              <EmptySection label={t("noTopIssues")} />
            )}
          </div>
        </div>

        <div className="surface-card p-4">
          <div>
            <h2 className="section-title">{t("reconciliationExports")}</h2>
            <p className="section-subtitle">{t("reconciliationExportsHelp")}</p>
          </div>
          <div className="mt-4 grid gap-2">
            <Button
              onClick={() =>
                downloadCsv(
                  reconciliationIssueHeaders,
                  reconciliationData.allIssueRows,
                  `${currentPrefix}-all-issues.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportAllReconciliationIssuesCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  reconciliationIssueHeaders,
                  reconciliationData.missingReceipts.map((issue) => [
                    t("missingReceipts"),
                    issue.level,
                    issue.transaction.id,
                    issue.transaction.date,
                    issue.transaction.vendor,
                    issue.transaction.source,
                    issue.transaction.category,
                    issue.transaction.tax_line,
                    issue.transaction.money_out || issue.transaction.money_in,
                    issue.transaction.receipt_link ? "Linked" : "Missing",
                    issue.transaction.reconciled ? "Yes" : "No",
                    issue.reasonCodes.map((reasonCode) => reasonLabel(reasonCode)).join("; "),
                    issue.transaction.notes
                  ]),
                  `${currentPrefix}-missing-receipts.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportMissingReceiptsCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  reconciliationIssueHeaders,
                  reconciliationData.needsReview.map((issue) => [
                    t("needsReview"),
                    issue.level,
                    issue.transaction.id,
                    issue.transaction.date,
                    issue.transaction.vendor,
                    issue.transaction.source,
                    issue.transaction.category,
                    issue.transaction.tax_line,
                    issue.transaction.money_out || issue.transaction.money_in,
                    issue.transaction.receipt_link ? "Linked" : "Missing",
                    issue.transaction.reconciled ? "Yes" : "No",
                    issue.reasonCodes.map((reasonCode) => reasonLabel(reasonCode)).join("; "),
                    issue.transaction.notes
                  ]),
                  `${currentPrefix}-needs-review.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportNeedsReviewCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  duplicateCandidateHeaders,
                  reconciliationData.duplicateRows,
                  `${currentPrefix}-duplicate-candidates.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportDuplicateCandidatesCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  reconciliationIssueHeaders,
                  reconciliationData.unreconciledTransactions.map((issue) => [
                    t("unreconciledTransactions"),
                    issue.level,
                    issue.transaction.id,
                    issue.transaction.date,
                    issue.transaction.vendor,
                    issue.transaction.source,
                    issue.transaction.category,
                    issue.transaction.tax_line,
                    issue.transaction.money_out || issue.transaction.money_in,
                    issue.transaction.receipt_link ? "Linked" : "Missing",
                    issue.transaction.reconciled ? "Yes" : "No",
                    issue.reasonCodes.map((reasonCode) => reasonLabel(reasonCode)).join("; "),
                    issue.transaction.notes
                  ]),
                  `${currentPrefix}-unreconciled-transactions.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportUnreconciledTransactionsCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  reconciliationIssueHeaders,
                  [...reconciliationData.ownerActivity, ...reconciliationData.internalTransfers].map(
                    (issue) => [
                      issue.issueKey === "ownerActivity"
                        ? t("ownerContributionsOwnerDraws")
                        : t("internalTransfers"),
                      issue.level,
                      issue.transaction.id,
                      issue.transaction.date,
                      issue.transaction.vendor,
                      issue.transaction.source,
                      issue.transaction.category,
                      issue.transaction.tax_line,
                      issue.transaction.money_out || issue.transaction.money_in,
                      issue.transaction.receipt_link ? "Linked" : "Missing",
                      issue.transaction.reconciled ? "Yes" : "No",
                      issue.reasonCodes.map((reasonCode) => reasonLabel(reasonCode)).join("; "),
                      issue.transaction.notes
                    ]
                  ),
                  `${currentPrefix}-owner-transfer-review.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportOwnerTransferReviewCsv")}
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  readinessChecklistHeaders,
                  reconciliationData.readinessChecklistRows,
                  `${currentPrefix}-monthly-readiness-checklist.csv`
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportMonthlyReadinessChecklistCsv")}
            </Button>
          </div>
        </div>
      </section>

      {sectionVisible(issueType, "missingReceipts") ? (
        <IssueSection
          count={reconciliationData.missingReceipts.length}
          title={t("missingReceipts")}
          tone="red"
        >
          {reconciliationData.missingReceipts.length ? (
            <div className="space-y-3">
              {reconciliationData.missingReceipts.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReceiptNotRequired={markReceiptNotRequired}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  onReceiptLinkChange={updateReceiptLink}
                  readOnly={reconciliationReadOnly}
                  showReceiptUpload
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "needsReview") ? (
        <IssueSection
          count={reconciliationData.needsReview.length}
          title={t("needsReview")}
          tone="amber"
        >
          {reconciliationData.needsReview.length ? (
            <div className="space-y-3">
              {reconciliationData.needsReview.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  onResolveReview={markReviewResolved}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  showResolveReview
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "uncategorizedTransactions") ? (
        <IssueSection
          count={reconciliationData.uncategorizedTransactions.length}
          title={t("uncategorizedTransactions")}
          tone="red"
        >
          {reconciliationData.uncategorizedTransactions.length ? (
            <div className="space-y-3">
              {reconciliationData.uncategorizedTransactions.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "unreconciledTransactions") ? (
        <IssueSection
          count={reconciliationData.unreconciledTransactions.length}
          title={t("unreconciledTransactions")}
          tone="amber"
        >
          {reconciliationData.unreconciledTransactions.length ? (
            <div className="space-y-3">
              {reconciliationData.unreconciledTransactions.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReconciled={markReconciled}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "possibleDuplicates") ? (
        <IssueSection
          count={reconciliationData.duplicateCandidates.length}
          title={t("possibleDuplicates")}
          tone="amber"
        >
          {reconciliationData.duplicateCandidates.length ? (
            <div className="space-y-3">
              {reconciliationData.duplicateCandidates.map((candidate) => (
                <DuplicateCandidateRow
                  auditEntries={auditLogs.filter(
                    (entry) =>
                      entry.entity_id === candidate.first.id || entry.entity_id === candidate.second.id
                  )}
                  candidate={candidate}
                  key={candidate.id}
                  onDeleteDuplicate={deleteDuplicate}
                  onMarkNotDuplicate={markNotDuplicate}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "revenueDeposits") ? (
        <IssueSection
          count={reconciliationData.revenueDeposits.length}
          title={t("revenueDeposits")}
          tone="amber"
        >
          {reconciliationData.revenueDeposits.length ? (
            <div className="space-y-3">
              {reconciliationData.revenueDeposits.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReconciled={markReconciled}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "expensePayments") ? (
        <IssueSection
          count={reconciliationData.expensePayments.length}
          title={t("expensePayments")}
          tone="red"
        >
          {reconciliationData.expensePayments.length ? (
            <div className="space-y-3">
              {reconciliationData.expensePayments.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReceiptNotRequired={markReceiptNotRequired}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  onReceiptLinkChange={updateReceiptLink}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  showReceiptUpload
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "ownerActivity") ? (
        <IssueSection
          count={reconciliationData.ownerActivity.length}
          title={t("ownerContributionsOwnerDraws")}
          tone="blue"
        >
          {reconciliationData.ownerActivity.length ? (
            <div className="space-y-3">
              {reconciliationData.ownerActivity.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReconciled={markReconciled}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "internalTransfers") ? (
        <IssueSection
          count={reconciliationData.internalTransfers.length}
          title={t("internalTransfers")}
          tone="blue"
        >
          {reconciliationData.internalTransfers.length ? (
            <div className="space-y-3">
              {reconciliationData.internalTransfers.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReconciled={markReconciled}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      {sectionVisible(issueType, "taxPackageIssues") ? (
        <IssueSection
          count={reconciliationData.taxPackageIssues.length}
          title={t("taxPackageIssues")}
          tone="amber"
        >
          {reconciliationData.taxPackageIssues.length ? (
            <div className="space-y-3">
              {reconciliationData.taxPackageIssues.map((issue) => (
                <TransactionIssueRow
                  auditEntries={auditLogs.filter((entry) => entry.entity_id === issue.transaction.id)}
                  categoryLabel={categoryLabel}
                  categories={categories}
                  closedPeriod={isDateInClosedPeriod(monthlyClosings, issue.transaction.date)}
                  issue={issue}
                  key={issue.id}
                  onAddNote={addNote}
                  onCategoryChange={updateCategory}
                  onMarkReconciled={markReconciled}
                  onOpenTransaction={(transaction) => setEditingTransactionId(transaction.id)}
                  readOnly={reconciliationReadOnly}
                  showCategorySelect
                  t={t}
                  taxLineLabel={taxLineLabel}
                />
              ))}
            </div>
          ) : (
            <EmptySection label={t("noIssuesInSection")} />
          )}
        </IssueSection>
      ) : null}

      <TransactionEditModal
        key={editingTransaction?.id ?? "reconciliation-transaction-edit-modal"}
        onClose={() => setEditingTransactionId(null)}
        transaction={editingTransaction}
      />
    </div>
  );
}
