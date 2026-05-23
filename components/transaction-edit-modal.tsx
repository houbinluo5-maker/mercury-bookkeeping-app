"use client";

import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ReceiptUploadControl } from "@/components/receipt-upload-control";
import { useI18n } from "@/lib/i18n";
import { accountOptions, sourceOptions } from "@/lib/seed-data";
import { useBookkeeping } from "@/lib/storage";
import type { Transaction, TransactionDraft } from "@/lib/types";

export function TransactionEditModal({
  transaction,
  onClose
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const { categories, deleteTransaction, updateTransaction } = useBookkeeping();
  const { categoryLabel, t } = useI18n();

  if (!transaction) return null;
  const currentTransaction = transaction;

  function setField<K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) {
    updateTransaction(currentTransaction.id, { [key]: value });
  }

  function onCategoryChange(categoryName: string) {
    const category = categories.find((item) => item.name === categoryName);
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

    updateTransaction(currentTransaction.id, patch);
  }

  function deleteCurrentTransaction() {
    if (window.confirm(t("deleteTransactionQuestion"))) {
      deleteTransaction(currentTransaction.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-6">
      <div className="w-full max-w-4xl rounded-lg border border-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-normal text-ink">{t("editTransaction")}</h2>
              <Badge tone={currentTransaction.reconciled ? "green" : "amber"}>
                {currentTransaction.reconciled ? t("reconciled") : t("needsReconciliation")}
              </Badge>
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

        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="form-label">{t("date")}</span>
            <input
              className="form-input"
              onChange={(event) => setField("date", event.target.value)}
              type="date"
              value={currentTransaction.date}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("account")}</span>
            <input
              className="form-input"
              list="edit-account-options"
              onChange={(event) => setField("account", event.target.value)}
              value={currentTransaction.account}
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
              onChange={(event) => setField("source", event.target.value)}
              value={currentTransaction.source}
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
              onChange={(event) => setField("vendor", event.target.value)}
              value={currentTransaction.vendor}
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="form-label">{t("description")}</span>
            <input
              className="form-input"
              onChange={(event) => setField("description", event.target.value)}
              value={currentTransaction.description}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("moneyIn")}</span>
            <input
              className="form-input"
              min="0"
              onChange={(event) => setField("money_in", Number(event.target.value))}
              step="0.01"
              type="number"
              value={currentTransaction.money_in}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("moneyOut")}</span>
            <input
              className="form-input"
              min="0"
              onChange={(event) => setField("money_out", Number(event.target.value))}
              step="0.01"
              type="number"
              value={currentTransaction.money_out}
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="form-label">{t("category")}</span>
            <select
              className="form-input"
              onChange={(event) => onCategoryChange(event.target.value)}
              value={currentTransaction.category}
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
              onChange={(event) => setField("tax_line", event.target.value)}
              value={currentTransaction.tax_line}
            />
          </label>
          <div className="space-y-3 md:col-span-2 xl:col-span-3">
            <label className="block space-y-1">
              <span className="form-label">{t("receiptLink")}</span>
              <input
                className="form-input"
                onChange={(event) => setField("receipt_link", event.target.value)}
                placeholder={t("receiptLinkPlaceholder")}
                type="text"
                value={currentTransaction.receipt_link}
              />
            </label>
            <ReceiptUploadControl
              onReceiptLinkChange={(receiptLink) => setField("receipt_link", receiptLink)}
              receiptLink={currentTransaction.receipt_link}
              receiptRequired={currentTransaction.receipt_required}
              transactionId={currentTransaction.id}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-6">
            <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
              <input
                checked={currentTransaction.receipt_required}
                onChange={(event) => setField("receipt_required", event.target.checked)}
                type="checkbox"
              />
              {t("receiptRequired")}
            </label>
            <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
              <input
                checked={currentTransaction.reconciled}
                onChange={(event) => setField("reconciled", event.target.checked)}
                type="checkbox"
              />
              {t("reconciled")}
            </label>
          </div>
          <label className="space-y-1 md:col-span-2 xl:col-span-4">
            <span className="form-label">{t("notes")}</span>
            <textarea
              className="form-textarea"
              onChange={(event) => setField("notes", event.target.value)}
              value={currentTransaction.notes}
            />
          </label>
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
