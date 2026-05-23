"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Save, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { classifyTransaction } from "@/lib/accounting-rules";
import {
  parseNaturalLanguageTransaction,
  sampleNaturalLanguagePhrases,
  type NaturalLanguageParseResult
} from "@/lib/natural-language-parser";
import { accountOptions, sourceOptions } from "@/lib/seed-data";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { useBookkeeping } from "@/lib/storage";
import type { TransactionDraft } from "@/lib/types";

const emptyDraft: TransactionDraft = {
  date: toDateInputValue(),
  account: "Mercury Checking",
  source: "Manual",
  vendor: "",
  description: "",
  currency: "USD",
  money_in: 0,
  money_out: 0,
  category: "Uncategorized",
  tax_line: "Needs review",
  receipt_required: true,
  receipt_link: "",
  reconciled: false,
  notes: ""
};

export function TransactionForm() {
  const router = useRouter();
  const { addTransaction, categories, settings } = useBookkeeping();
  const [draft, setDraft] = useState<TransactionDraft>({
    ...emptyDraft,
    account: settings.default_account,
    currency: settings.default_currency
  });
  const [appliedRule, setAppliedRule] = useState<string>("");
  const [naturalInput, setNaturalInput] = useState("");
  const [parseResult, setParseResult] = useState<NaturalLanguageParseResult | null>(null);

  const suggestedRule = useMemo(() => classifyTransaction(draft), [draft]);
  const requiresNaturalPreview = naturalInput.trim().length > 0 && !parseResult;

  function setField<K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setNaturalLanguage(value: string) {
    setNaturalInput(value);
    setParseResult(null);
    setAppliedRule("");
  }

  function parseNaturalLanguage(value = naturalInput) {
    const result = parseNaturalLanguageTransaction(value, {
      defaultAccount: settings.default_account,
      defaultCurrency: settings.default_currency
    });

    setNaturalInput(value);
    setDraft(result.draft);
    setParseResult(result);
    setAppliedRule(result.needsReview ? "Needs review before saving." : "Parsed from natural language.");
  }

  function applyRule() {
    setDraft((current) => ({
      ...current,
      category: suggestedRule.category,
      tax_line: suggestedRule.tax_line,
      receipt_required: suggestedRule.receipt_required,
      reconciled: suggestedRule.reconciled,
      notes: current.notes || suggestedRule.notes || current.notes
    }));
    setAppliedRule(suggestedRule.reason);
  }

  function onCategoryChange(categoryName: string) {
    const category = categories.find((item) => item.name === categoryName);
    setDraft((current) => ({
      ...current,
      category: categoryName,
      tax_line: category?.tax_line ?? current.tax_line,
      receipt_required: category?.receipt_required_default ?? current.receipt_required
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requiresNaturalPreview) {
      return;
    }

    addTransaction(draft);
    router.push("/transactions");
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <label className="block flex-1 space-y-1">
            <span className="form-label">Natural Language Entry</span>
            <textarea
              className="form-textarea min-h-20"
              onChange={(event) => setNaturalLanguage(event.target.value)}
              placeholder="Today Meta ads spent 400 dollars"
              value={naturalInput}
            />
          </label>
          <div className="pt-6">
            <Button disabled={!naturalInput.trim()} onClick={() => parseNaturalLanguage()}>
              <Wand2 aria-hidden="true" className="h-4 w-4" />
              Parse sentence
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sampleNaturalLanguagePhrases.map((phrase) => (
            <Button
              className="h-auto min-h-9 px-2 py-1 text-xs"
              key={phrase}
              onClick={() => parseNaturalLanguage(phrase)}
            >
              {phrase}
            </Button>
          ))}
        </div>

        {parseResult ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={parseResult.needsReview ? "amber" : "green"}>
                  {parseResult.summary}
                </Badge>
                {parseResult.needsReview ? <Badge tone="red">Needs review</Badge> : null}
                <span className="text-sm text-slate-600">
                  {Math.round(parseResult.confidence * 100)}% parser confidence
                </span>
              </div>
              <p className="text-sm font-semibold text-ink">Confirmation preview</p>
            </div>
            <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="form-label">Date</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{formatDate(draft.date)}</dd>
              </div>
              <div>
                <dt className="form-label">Amount</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {draft.money_in > 0
                    ? `${formatCurrency(draft.money_in, draft.currency)} in`
                    : `${formatCurrency(draft.money_out, draft.currency)} out`}
                </dd>
              </div>
              <div>
                <dt className="form-label">Vendor</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{draft.vendor || "Needs review"}</dd>
              </div>
              <div>
                <dt className="form-label">Category</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{draft.category}</dd>
              </div>
              <div>
                <dt className="form-label">Tax Line</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{draft.tax_line}</dd>
              </div>
              <div>
                <dt className="form-label">Receipt</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {draft.receipt_required ? "Required" : "Optional"}
                </dd>
              </div>
              <div>
                <dt className="form-label">Reconciliation</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {draft.reconciled ? "Reconciled" : "Needs reconciliation"}
                </dd>
              </div>
              <div>
                <dt className="form-label">Source</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{draft.source}</dd>
              </div>
            </dl>
            {parseResult.issues.length > 0 ? (
              <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{parseResult.issues.join(" ")}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="form-label">Date</span>
          <input
            className="form-input"
            onChange={(event) => setField("date", event.target.value)}
            required
            type="date"
            value={draft.date}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label">Account</span>
          <input
            className="form-input"
            list="account-options"
            onChange={(event) => setField("account", event.target.value)}
            required
            value={draft.account}
          />
          <datalist id="account-options">
            {accountOptions.map((account) => (
              <option key={account} value={account} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1">
          <span className="form-label">Source</span>
          <input
            className="form-input"
            list="source-options"
            onChange={(event) => setField("source", event.target.value)}
            required
            value={draft.source}
          />
          <datalist id="source-options">
            {sourceOptions.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1">
          <span className="form-label">Vendor</span>
          <input
            className="form-input"
            onChange={(event) => setField("vendor", event.target.value)}
            placeholder="Shopify Payout"
            value={draft.vendor}
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_14rem_14rem]">
        <label className="space-y-1">
          <span className="form-label">Description</span>
          <input
            className="form-input"
            onChange={(event) => setField("description", event.target.value)}
            required
            value={draft.description}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label">Money In</span>
          <input
            className="form-input"
            min="0"
            onChange={(event) => setField("money_in", Number(event.target.value))}
            step="0.01"
            type="number"
            value={draft.money_in}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label">Money Out</span>
          <input
            className="form-input"
            min="0"
            onChange={(event) => setField("money_out", Number(event.target.value))}
            step="0.01"
            type="number"
            value={draft.money_out}
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem]">
        <label className="space-y-1">
          <span className="form-label">Category</span>
          <select
            className="form-input"
            onChange={(event) => onCategoryChange(event.target.value)}
            value={draft.category}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="form-label">Tax Line</span>
          <input
            className="form-input"
            onChange={(event) => setField("tax_line", event.target.value)}
            value={draft.tax_line}
          />
        </label>
        <label className="space-y-1">
          <span className="form-label">Currency</span>
          <input
            className="form-input"
            onChange={(event) => setField("currency", event.target.value.toUpperCase())}
            required
            value={draft.currency}
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <label className="space-y-1">
          <span className="form-label">Receipt Link</span>
          <input
            className="form-input"
            onChange={(event) => setField("receipt_link", event.target.value)}
            placeholder="https://..."
            type="url"
            value={draft.receipt_link}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 pt-6">
          <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
            <input
              checked={draft.receipt_required}
              onChange={(event) => setField("receipt_required", event.target.checked)}
              type="checkbox"
            />
            Receipt required
          </label>
          <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
            <input
              checked={draft.reconciled}
              onChange={(event) => setField("reconciled", event.target.checked)}
              type="checkbox"
            />
            Reconciled
          </label>
        </div>
      </section>

      <label className="block space-y-1">
        <span className="form-label">Notes</span>
        <textarea
          className="form-textarea"
          onChange={(event) => setField("notes", event.target.value)}
          value={draft.notes}
        />
      </label>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={suggestedRule.category === "Uncategorized" ? "amber" : "blue"}>
            {suggestedRule.category}
          </Badge>
          <span className="text-sm text-slate-600">{appliedRule || suggestedRule.reason}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={applyRule}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Apply rules
          </Button>
          <Button disabled={requiresNaturalPreview} type="submit" variant="primary">
            <Save aria-hidden="true" className="h-4 w-4" />
            {requiresNaturalPreview ? "Parse before saving" : "Save transaction"}
          </Button>
        </div>
      </div>

      {draft.money_in > 0 && draft.money_out > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Check aria-hidden="true" className="h-4 w-4" />
          Split entries should be recorded as separate transactions.
        </div>
      ) : null}
    </form>
  );
}
