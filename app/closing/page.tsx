"use client";

import { useMemo, useState } from "react";
import { Download, LockKeyhole, RotateCcw } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { YearSelect } from "@/components/period-selectors";
import { getAvailableYears } from "@/lib/calculations";
import {
  buildClosingSummary,
  buildMonthlyClosingCards,
  closingReadinessThreshold,
  closingStatusTone
} from "@/lib/monthly-closing";
import { downloadCsv } from "@/lib/tax-package";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import type { MonthlyClosingCard } from "@/lib/monthly-closing";
import type { MonthlyClosingStatus } from "@/lib/types";

const checklistItems = [
  ["noMissingRequiredReceipts", "missingReceiptsCount"],
  ["noNeedsReviewTransactions", "needsReviewCount"],
  ["noUncategorizedTransactions", "uncategorizedCount"],
  ["noUnreconciledTransactions", "unreconciledCount"],
  ["noUnresolvedDuplicateCandidates", "possibleDuplicatesCount"],
  ["taxPackageSummaryReviewed", "taxPackageSummaryReviewed"],
  ["reconciliationCenterReviewed", "reconciliationCenterReviewed"],
  ["backupExported", "backupExported"]
] as const;

function statusLabelKey(status: MonthlyClosingStatus) {
  if (status === "closed") return "closedStatus";
  if (status === "ready_to_close") return "readyToCloseStatus";
  if (status === "reopened") return "reopenedStatus";
  return "openStatus";
}

function toCsvRows(cards: MonthlyClosingCard[]) {
  return cards.map((card) => [
    card.closing.year,
    card.closing.month,
    card.closing.status,
    card.closing.readiness_score,
    card.totalTransactions,
    card.revenue,
    card.expenses,
    card.netIncome,
    card.missingReceiptsCount,
    card.needsReviewCount,
    card.uncategorizedCount,
    card.unreconciledCount,
    card.possibleDuplicatesCount,
    card.closing.close_reason,
    card.closing.reopen_reason,
    card.closing.closed_at ?? "",
    card.closing.reopened_at ?? "",
    card.auditLogCount
  ]);
}

export default function ClosingPage() {
  const {
    auditLogs,
    categories,
    closeMonth,
    monthlyClosings,
    permissions,
    reopenMonth,
    settings,
    transactions
  } = useBookkeeping();
  const { monthLabel, t } = useI18n();
  const years = useMemo(
    () => Array.from(new Set([...getAvailableYears(transactions), settings.tax_year])).sort((a, b) => b - a),
    [settings.tax_year, transactions]
  );
  const [taxYear, setTaxYear] = useState(settings.tax_year);
  const [statusFilter, setStatusFilter] = useState<MonthlyClosingStatus | "all">("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [issueFilter, setIssueFilter] = useState("all");
  const [activeCard, setActiveCard] = useState<MonthlyClosingCard | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const cards = useMemo(
    () => buildMonthlyClosingCards(transactions, categories, auditLogs, monthlyClosings, taxYear),
    [auditLogs, categories, monthlyClosings, taxYear, transactions]
  );
  const filteredCards = cards.filter((card) => {
    const statusMatch = statusFilter === "all" || card.closing.status === statusFilter;
    const monthMatch = monthFilter === "all" || String(card.closing.month) === monthFilter;
    const issueMatch =
      issueFilter === "all" ||
      (issueFilter === "missingReceipts" && card.missingReceiptsCount > 0) ||
      (issueFilter === "needsReview" && card.needsReviewCount > 0) ||
      (issueFilter === "uncategorizedTransactions" && card.uncategorizedCount > 0) ||
      (issueFilter === "unreconciledTransactions" && card.unreconciledCount > 0) ||
      (issueFilter === "possibleDuplicates" && card.possibleDuplicatesCount > 0);

    return statusMatch && monthMatch && issueMatch;
  });
  const closedCount = cards.filter((card) => card.closing.status === "closed").length;
  const reopenedCount = cards.filter((card) => card.closing.status === "reopened").length;
  const changedClosedCount = cards.filter((card) => card.closedPeriodChangeCount > 0).length;

  function openCloseModal(card: MonthlyClosingCard) {
    if (!permissions.canCloseMonth) return;

    const defaults = {
      noMissingRequiredReceipts: card.missingReceiptsCount === 0,
      noNeedsReviewTransactions: card.needsReviewCount === 0,
      noUncategorizedTransactions: card.uncategorizedCount === 0,
      noUnreconciledTransactions: card.unreconciledCount === 0,
      noUnresolvedDuplicateCandidates: card.possibleDuplicatesCount === 0
    };

    setChecklist(defaults);
    setReason("");
    setActiveCard(card);
  }

  async function submitClose() {
    if (!permissions.canCloseMonth) return;
    if (!activeCard) return;
    if (!reason.trim()) return;

    const summary = buildClosingSummary(
      transactions,
      categories,
      auditLogs,
      activeCard.closing.year,
      activeCard.closing.month,
      checklist
    );
    const readyEnough = activeCard.closing.readiness_score >= closingReadinessThreshold;
    const confirmedOverride =
      readyEnough || window.confirm(`${t("notReady")} - ${t("closeMonthWarning")}`);

    if (!confirmedOverride) return;

    await closeMonth(activeCard.closing.year, activeCard.closing.month, reason, {
      ...checklist,
      backup_exported: Boolean(checklist.backupExported),
      summary_reviewed: Boolean(checklist.taxPackageSummaryReviewed)
    });
    void summary;
    setActiveCard(null);
  }

  async function submitReopen(card: MonthlyClosingCard) {
    if (!permissions.canReopenMonth) return;

    const response = window.prompt(t("reopenReason"));

    if (!response?.trim()) return;

    await reopenMonth(card.closing.year, card.closing.month, response);
  }

  function exportClosedPeriodChanges() {
    const rows = auditLogs
      .filter((entry) =>
        cards.some(
          (card) =>
            card.closing.status === "closed" &&
            card.closing.closed_at &&
            entry.created_at > card.closing.closed_at
        )
      )
      .map((entry) => [
        entry.created_at,
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.field_name,
        entry.old_value,
        entry.new_value,
        entry.reason,
        entry.actor,
        entry.source
      ]);

    downloadCsv(
      ["Timestamp", "Entity Type", "Entity ID", "Action", "Field", "Old Value", "New Value", "Reason", "Actor", "Source"],
      rows,
      `${taxYear}-closed-period-changes.csv`
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <YearSelect onChange={setTaxYear} value={taxYear} years={years} />
            <Button onClick={() => downloadCsv(
              [
                "Year",
                "Month",
                "Status",
                "Readiness Score",
                "Total Transactions",
                "Revenue",
                "Expenses",
                "Net Income",
                "Missing Receipts",
                "Needs Review",
                "Uncategorized",
                "Unreconciled",
                "Possible Duplicates",
                "Close Reason",
                "Reopen Reason",
                "Closed At",
                "Reopened At",
                "Related Audit Log Count"
              ],
              toCsvRows(cards),
              `${taxYear}-monthly-closing-summary.csv`
            )}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("monthlyClosingSummaryCsv")}
            </Button>
            <Button onClick={exportClosedPeriodChanges}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("closedPeriodChangesCsv")}
            </Button>
          </>
        }
        eyebrow={`${settings.company_name} - ${taxYear}`}
        title={t("monthlyClosing")}
      />

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <p className="text-sm text-slate-700">{t("monthlyClosingHelp")}</p>
      </section>

      {!permissions.canCloseMonth && !permissions.canReopenMonth ? (
        <PermissionNotice detailKey="permissionRequiredOwnerAdmin" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("closedStatus")} tone="green" value={String(closedCount)} />
        <MetricCard label={t("reopenedStatus")} tone={reopenedCount ? "amber" : "green"} value={String(reopenedCount)} />
        <MetricCard label={t("closedPeriodChangedWarning")} tone={changedClosedCount ? "red" : "green"} value={String(changedClosedCount)} />
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="form-label">{t("status")}</span>
            <select className="form-input" onChange={(event) => setStatusFilter(event.target.value as MonthlyClosingStatus | "all")} value={statusFilter}>
              <option value="all">{t("allClosingStatuses")}</option>
              <option value="open">{t("openStatus")}</option>
              <option value="ready_to_close">{t("readyToCloseStatus")}</option>
              <option value="closed">{t("closedStatus")}</option>
              <option value="reopened">{t("reopenedStatus")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("month")}</span>
            <select className="form-input" onChange={(event) => setMonthFilter(event.target.value)} value={monthFilter}>
              <option value="all">{t("allMonths")}</option>
              {cards.map((card) => (
                <option key={card.closing.id} value={card.closing.month}>
                  {monthLabel(card.closing.month - 1)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("issueType")}</span>
            <select className="form-input" onChange={(event) => setIssueFilter(event.target.value)} value={issueFilter}>
              <option value="all">{t("allIssueTypes")}</option>
              <option value="missingReceipts">{t("missingReceipts")}</option>
              <option value="needsReview">{t("needsReview")}</option>
              <option value="uncategorizedTransactions">{t("uncategorizedTransactions")}</option>
              <option value="unreconciledTransactions">{t("unreconciledTransactions")}</option>
              <option value="possibleDuplicates">{t("possibleDuplicates")}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {filteredCards.map((card) => (
          <article className="rounded-lg border border-line bg-white p-4 shadow-soft" key={card.closing.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {monthLabel(card.closing.month - 1)} {card.closing.year}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {card.totalTransactions} {t("transactions")}
                </p>
              </div>
              <Badge tone={closingStatusTone(card.closing.status)}>
                {t(statusLabelKey(card.closing.status))}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="form-label">{t("revenue")}</p>
                <p className="font-semibold text-mint">{formatCurrency(card.revenue)}</p>
              </div>
              <div>
                <p className="form-label">{t("expenses")}</p>
                <p className="font-semibold text-coral">{formatCurrency(card.expenses)}</p>
              </div>
              <div>
                <p className="form-label">{t("netIncome")}</p>
                <p className="font-semibold text-ink">{formatCurrency(card.netIncome)}</p>
              </div>
              <div>
                <p className="form-label">{t("monthlyReadinessScore")}</p>
                <p className="font-semibold text-ink">{card.closing.readiness_score}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Badge tone={card.missingReceiptsCount ? "red" : "green"}>{t("missingReceipts")}: {card.missingReceiptsCount}</Badge>
              <Badge tone={card.needsReviewCount ? "amber" : "green"}>{t("needsReview")}: {card.needsReviewCount}</Badge>
              <Badge tone={card.uncategorizedCount ? "red" : "green"}>{t("uncategorizedTransactions")}: {card.uncategorizedCount}</Badge>
              <Badge tone={card.unreconciledCount ? "amber" : "green"}>{t("unreconciled")}: {card.unreconciledCount}</Badge>
              <Badge tone={card.possibleDuplicatesCount ? "amber" : "green"}>{t("possibleDuplicates")}: {card.possibleDuplicatesCount}</Badge>
              <Badge tone={card.closedPeriodChangeCount ? "red" : "neutral"}>{t("auditTrail")}: {card.closedPeriodChangeCount}</Badge>
            </div>

            {card.closing.status === "reopened" ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {t("reopenMonthWarning")}
              </div>
            ) : null}
            {card.closedPeriodChangeCount ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {t("closedPeriodChangedWarning")}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {card.closing.status === "closed" && permissions.canReopenMonth ? (
                <Button onClick={() => submitReopen(card)}>
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  {t("reopenMonth")}
                </Button>
              ) : card.closing.status !== "closed" && permissions.canCloseMonth ? (
                <Button onClick={() => openCloseModal(card)} variant="primary">
                  <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                  {t("closeMonth")}
                </Button>
              ) : null}
              <Button onClick={() => downloadCsv(
                ["Checklist Item", "Status"],
                checklistItems.map(([key]) => [
                  t(key),
                  Boolean(card.closing.summary_json.checklist?.[key]) ? "Yes" : "No"
                ]),
                `${card.closing.year}-${card.closing.month}-closing-checklist.csv`
              )}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {t("monthlyClosingChecklistCsv")}
              </Button>
            </div>
          </article>
        ))}
      </section>

      {activeCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg border border-line bg-white p-4 shadow-soft">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t("closingChecklist")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("closeMonthWarning")}</p>
            </div>
            <div className="mt-4 grid gap-2">
              {checklistItems.map(([key]) => (
                <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm" key={key}>
                  <input
                    checked={Boolean(checklist[key])}
                    onChange={(event) =>
                      setChecklist((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  {t(key)}
                </label>
              ))}
            </div>
            <label className="mt-4 block space-y-1">
              <span className="form-label">{t("closeReason")}</span>
              <textarea
                className="form-textarea"
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setActiveCard(null)}>{t("cancel")}</Button>
              <Button disabled={!reason.trim()} onClick={submitClose} variant="primary">
                {t("closeMonth")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
