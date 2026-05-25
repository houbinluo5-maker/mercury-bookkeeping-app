"use client";

import { useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import { AuditHistoryPanel } from "@/components/audit-history-panel";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ReceiptUploadControl } from "@/components/receipt-upload-control";
import { promptOptionalAuditReason, promptRequiredAuditReason } from "@/lib/audit-reason";
import { useI18n } from "@/lib/i18n";
import {
  isDateInClosedPeriod,
  requiresClosedPeriodReason
} from "@/lib/monthly-closing";
import { accountOptions, sourceOptions } from "@/lib/seed-data";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction, TransactionDraft } from "@/lib/types";

function valuesMatch(left: unknown, right: unknown) {
  if (typeof left === "number" || typeof right === "number") {
    return Number(left ?? 0) === Number(right ?? 0);
  }

  return left === right;
}

export function TransactionEditModal({
  transaction,
  onClose
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const { auditLogs, categories, deleteTransaction, monthlyClosings, updateTransaction } = useBookkeeping();
  const { categoryLabel, t } = useI18n();
  const [draft, setDraft] = useState<Transaction | null>(transaction);

  const historyEntries = useMemo(
    () => auditLogs.filter((entry) => entry.entity_id === transaction?.id),
    [auditLogs, transaction?.id]
  );

  if (!transaction || !draft) return null;
  const currentTransaction = transaction;

  function setDraftField<K extends keyof Transaction>(key: K, value: Transaction[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function commitField<K extends keyof TransactionDraft>(
    key: K,
    value: TransactionDraft[K],
    options: { promptKey?: string; reason?: string } = {}
  ) {
    const originalValue = currentTransaction[key];

    if (valuesMatch(originalValue, value)) return;

    let reason = options.reason;
    const closedPeriodReasonRequired = requiresClosedPeriodReason(
      monthlyClosings,
      currentTransaction,
      { [key]: value } as Partial<TransactionDraft>
    );

    if (!reason && (options.promptKey || closedPeriodReasonRequired)) {
      const response = closedPeriodReasonRequired
        ? promptRequiredAuditReason(t, t(options.promptKey ?? "closedPeriod"))
        : promptOptionalAuditReason(t, t(options.promptKey!));

      if (response === null) {
        setDraftField(key, currentTransaction[key] as Transaction[K]);
        return;
      }

      reason = response;
    }

    updateTransaction(
      currentTransaction.id,
      { [key]: value },
      {
        reason,
        source: "manual"
      }
    );
  }

  function onCategoryChange(categoryName: string) {
    const category = categories.find((item) => item.name === categoryName);
    const reason = isDateInClosedPeriod(monthlyClosings, currentTransaction.date)
      ? promptRequiredAuditReason(t, t("category"))
      : promptOptionalAuditReason(t, t("category"));

    if (reason === null) {
      setDraftField("category", currentTransaction.category);
      return;
    }

    const shouldUpdateReceiptRequired =
      category &&
      category.receipt_required_default !== currentTransaction.receipt_required &&
      window.confirm(
        t("updateReceiptRequirementQuestion")
          .replace("{category}", categoryLabel(category.name))
          .replace(
            "{default}",
            category.receipt_required_default ? t("required") : t("optional")
          )
      );
    const patch: Partial<TransactionDraft> = {
      category: categoryName,
      tax_line: category?.tax_line ?? currentTransaction.tax_line
    };

    if (category && shouldUpdateReceiptRequired) {
      patch.receipt_required = category.receipt_required_default;
    }

    updateTransaction(currentTransaction.id, patch, {
      reason,
      source: "manual"
    });
  }

  function deleteCurrentTransaction() {
    const isClosedPeriod = isDateInClosedPeriod(monthlyClosings, currentTransaction.date);

    if (!window.confirm(isClosedPeriod ? t("closedPeriodDeleteWarning") : t("deleteTransactionQuestion"))) return;

    const reason = isClosedPeriod
      ? promptRequiredAuditReason(t, t("deleteTransaction"))
      : promptOptionalAuditReason(t, t("deleteTransaction"));

    if (reason === null) return;

    deleteTransaction(currentTransaction.id, { reason, source: "manual" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-6">
      <div className="w-full max-w-5xl rounded-lg border border-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-normal text-ink">{t("editTransaction")}</h2>
              <Badge tone={currentTransaction.reconciled ? "green" : "amber"}>
                {currentTransaction.reconciled ? t("reconciled") : t("needsReconciliation")}
              </Badge>
              {isDateInClosedPeriod(monthlyClosings, currentTransaction.date) ? (
                <Badge tone="red">{t("closedPeriod")}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{t("changesSaveImmediately")}</p>
          </div>
          <button
            aria-label={t("close")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="form-label">{t("date")}</span>
                <input
                  className="form-input"
                  onBlur={(event) => commitField("date", event.target.value)}
                  onChange={(event) => setDraftField("date", event.target.value)}
                  type="date"
                  value={draft.date}
                />
              </label>
              <label className="space-y-1">
                <span className="form-label">{t("account")}</span>
                <input
                  className="form-input"
                  list="edit-account-options"
                  onBlur={(event) => commitField("account", event.target.value)}
                  onChange={(event) => setDraftField("account", event.target.value)}
                  value={draft.account}
                />
                <datalist id="edit-account-options">
                  {accountOptions.map((account) => (
                    <option key={account} value={account} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="form-label">{t("source")}</span>
                <input
                  className="form-input"
                  list="edit-source-options"
                  onBlur={(event) => commitField("source", event.target.value)}
                  onChange={(event) => setDraftField("source", event.target.value)}
                  value={draft.source}
                />
                <datalist id="edit-source-options">
                  {sourceOptions.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="form-label">{t("vendor")}</span>
                <input
                  className="form-input"
                  onBlur={(event) => commitField("vendor", event.target.value)}
                  onChange={(event) => setDraftField("vendor", event.target.value)}
                  value={draft.vendor}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="form-label">{t("description")}</span>
                <input
                  className="form-input"
                  onBlur={(event) => commitField("description", event.target.value)}
                  onChange={(event) => setDraftField("description", event.target.value)}
                  value={draft.description}
                />
              </label>
              <label className="space-y-1">
                <span className="form-label">{t("moneyIn")}</span>
                <input
                  className="form-input"
                  min="0"
                  onBlur={(event) =>
                    commitField("money_in", Number(event.target.value), { promptKey: "moneyIn" })
                  }
                  onChange={(event) => setDraftField("money_in", Number(event.target.value))}
                  step="0.01"
                  type="number"
                  value={draft.money_in}
                />
              </label>
              <label className="space-y-1">
                <span className="form-label">{t("moneyOut")}</span>
                <input
                  className="form-input"
                  min="0"
                  onBlur={(event) =>
                    commitField("money_out", Number(event.target.value), { promptKey: "moneyOut" })
                  }
                  onChange={(event) => setDraftField("money_out", Number(event.target.value))}
                  step="0.01"
                  type="number"
                  value={draft.money_out}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="form-label">{t("category")}</span>
                <select
                  className="form-input"
                  onChange={(event) => {
                    setDraftField("category", event.target.value);
                    onCategoryChange(event.target.value);
                  }}
                  value={draft.category}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {categoryLabel(category.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="form-label">{t("taxLine")}</span>
                <input
                  className="form-input"
                  onBlur={(event) =>
                    commitField("tax_line", event.target.value, { promptKey: "taxLine" })
                  }
                  onChange={(event) => setDraftField("tax_line", event.target.value)}
                  value={draft.tax_line}
                />
              </label>
              <div className="space-y-3 md:col-span-2 xl:col-span-3">
                <label className="block space-y-1">
                  <span className="form-label">{t("receiptLink")}</span>
                  <input
                    className="form-input"
                    onBlur={(event) =>
                      commitField("receipt_link", event.target.value, {
                        promptKey:
                          currentTransaction.receipt_link && !event.target.value
                            ? "deleteReceipt"
                            : undefined
                      })
                    }
                    onChange={(event) => setDraftField("receipt_link", event.target.value)}
                    placeholder={t("receiptLinkPlaceholder")}
                    type="text"
                    value={draft.receipt_link}
                  />
                </label>
                <ReceiptUploadControl
                  onReceiptLinkChange={(receiptLink, audit) => {
                    setDraftField("receipt_link", receiptLink);
                    updateTransaction(
                      currentTransaction.id,
                      { receipt_link: receiptLink },
                      {
                        actionsByField: audit?.action
                          ? { receipt_link: audit.action }
                          : undefined,
                        reason: audit?.reason,
                        source: audit?.source ?? "receipt_upload"
                      }
                    );
                  }}
                  receiptLink={draft.receipt_link}
                  receiptRequired={draft.receipt_required}
                  transactionId={currentTransaction.id}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-6">
                <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
                  <input
                    checked={draft.receipt_required}
                    onChange={(event) => {
                      const nextValue = event.target.checked;
                      setDraftField("receipt_required", nextValue);
                      commitField("receipt_required", nextValue, { promptKey: "receiptRequired" });
                    }}
                    type="checkbox"
                  />
                  {t("receiptRequired")}
                </label>
                <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
                  <input
                    checked={draft.reconciled}
                    onChange={(event) => {
                      const nextValue = event.target.checked;
                      setDraftField("reconciled", nextValue);
                      commitField("reconciled", nextValue, { promptKey: "reconciled" });
                    }}
                    type="checkbox"
                  />
                  {t("reconciled")}
                </label>
              </div>
              <label className="space-y-1 md:col-span-2 xl:col-span-4">
                <span className="form-label">{t("notes")}</span>
                <textarea
                  className="form-textarea"
                  onBlur={(event) => commitField("notes", event.target.value)}
                  onChange={(event) => setDraftField("notes", event.target.value)}
                  value={draft.notes}
                />
              </label>
            </div>
          </div>

          <AuditHistoryPanel
            emptyLabel={t("noAuditEntries")}
            entries={historyEntries}
            limit={12}
            title={t("auditHistory")}
          />
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-line p-4">
          <Button onClick={deleteCurrentTransaction} variant="danger">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {t("deleteTransaction")}
          </Button>
          <Button onClick={onClose} variant="primary">
            {t("done")}
          </Button>
        </div>
      </div>
    </div>
  );
}
