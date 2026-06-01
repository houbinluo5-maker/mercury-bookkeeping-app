"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Eraser,
  FileUp,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Wand2
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button, buttonClassName } from "@/components/button";
import {
  displaySmartCategory,
  parseNaturalLanguageTransaction,
  receiptStatusLabel,
  transactionTypeLabel,
  type NaturalLanguageParseResult,
  type SmartFieldStatus,
  type SmartReceiptStatus,
  type SmartTransactionType
} from "@/lib/natural-language-parser";
import { accountOptions, sourceOptions } from "@/lib/seed-data";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import type { TransactionDraft } from "@/lib/types";

type EntryMode = "smart" | "sheet";
type SaveIntent = "default" | "continue" | "receipt";

type FormState = {
  account: string;
  category: string;
  counterparty: string;
  currency: string;
  date: string;
  expenseAmount: string;
  incomeAmount: string;
  merchant: string;
  notes: string;
  orderOrInvoiceNo: string;
  paymentMethod: string;
  purpose: string;
  receiptLink: string;
  receiptRequired: boolean;
  receiptStatus: SmartReceiptStatus;
  reimbursable: boolean;
  taxCategory: string;
  type: SmartTransactionType;
};

const examplePhrases = [
  "今天 Meta 广告花费 400 美元",
  "今天 Facebook 广告花费 400 美元",
  "今天收到 Shopify 打款 1260 美元",
  "支付供应商 850 用于库存",
  "支付 Shopify 应用 120",
  "从 Mercury 转 500 到业主个人账户",
  "业主向公司投入 2000",
  "5月30日 支付供应商 2300 元采购库存，用建设银行卡，需收据"
];

const transactionTypeOptions: Array<{ label: string; value: SmartTransactionType }> = [
  { label: "收入", value: "income" },
  { label: "支出", value: "expense" },
  { label: "转账", value: "transfer" },
  { label: "业主投入", value: "owner_contribution" },
  { label: "业主提取", value: "owner_draw" },
  { label: "报销", value: "reimbursement" }
];

const receiptStatusOptions: Array<{ label: string; value: SmartReceiptStatus }> = [
  { label: "已上传", value: "uploaded" },
  { label: "待补", value: "missing" },
  { label: "无需", value: "not_required" }
];

function emptyForm(defaultAccount: string, defaultCurrency: string): FormState {
  return {
    account: defaultAccount,
    category: "Uncategorized",
    counterparty: "",
    currency: defaultCurrency,
    date: toDateInputValue(),
    expenseAmount: "",
    incomeAmount: "",
    merchant: "",
    notes: "",
    orderOrInvoiceNo: "",
    paymentMethod: "",
    purpose: "",
    receiptLink: "",
    receiptRequired: true,
    receiptStatus: "missing",
    reimbursable: false,
    taxCategory: "Needs review",
    type: "expense"
  };
}

function amountToInput(value?: number) {
  return value && value > 0 ? String(value) : "";
}

function amountFromInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
}

function stateFromParse(result: NaturalLanguageParseResult, fallback: FormState): FormState {
  const fields = result.fields;

  return {
    account: fields.account || result.draft.account || fallback.account,
    category: result.draft.category || fields.category || fallback.category,
    counterparty: fields.counterparty || fallback.counterparty,
    currency: fields.currency || result.draft.currency || fallback.currency,
    date: fields.date || result.draft.date || fallback.date,
    expenseAmount: amountToInput(fields.expenseAmount ?? result.draft.money_out),
    incomeAmount: amountToInput(fields.incomeAmount ?? result.draft.money_in),
    merchant: fields.merchant || result.draft.vendor || fallback.merchant,
    notes: fallback.notes,
    orderOrInvoiceNo: fields.orderOrInvoiceNo || fallback.orderOrInvoiceNo,
    paymentMethod: fields.paymentMethod || fallback.paymentMethod,
    purpose: fields.purpose || result.draft.description || fallback.purpose,
    receiptLink: fields.receiptLink || result.draft.receipt_link || fallback.receiptLink,
    receiptRequired: fields.receiptRequired ?? result.draft.receipt_required ?? fallback.receiptRequired,
    receiptStatus: fields.receiptStatus || (result.draft.receipt_link ? "uploaded" : result.draft.receipt_required ? "missing" : "not_required"),
    reimbursable: fields.reimbursable ?? fallback.reimbursable,
    taxCategory: fields.taxCategory || result.draft.tax_line || fallback.taxCategory,
    type: fields.type || (result.draft.money_in > 0 ? "income" : "expense")
  };
}

function sourceFromState(state: FormState) {
  const merchant = state.merchant.toLowerCase();

  if (merchant.includes("meta")) return "Meta Ads";
  if (merchant.includes("facebook")) return "Facebook Ads";
  if (merchant.includes("tiktok")) return "TikTok Ads";
  if (merchant.includes("shopify")) return "Shopify";
  if (merchant.includes("paypal")) return "PayPal";
  if (merchant.includes("mercury")) return "Mercury";
  if (merchant.includes("供应商") || state.counterparty.includes("供应商")) return "Supplier";
  if (state.paymentMethod) return state.paymentMethod;

  return "Manual";
}

function buildNotes(state: FormState) {
  return [
    state.paymentMethod ? `支付方式：${state.paymentMethod}` : "",
    state.account ? `账户/卡号：${state.account}` : "",
    state.counterparty ? `交易对象：${state.counterparty}` : "",
    state.orderOrInvoiceNo ? `订单号/发票号：${state.orderOrInvoiceNo}` : "",
    state.receiptStatus ? `票据状态：${receiptStatusLabel(state.receiptStatus)}` : "",
    `是否可报销：${state.reimbursable ? "是" : "否"}`,
    state.notes
  ]
    .filter(Boolean)
    .join("\n");
}

function draftFromState(state: FormState): TransactionDraft {
  const typeIsIncome = state.type === "income" || state.type === "owner_contribution";
  const incomeAmount = typeIsIncome ? amountFromInput(state.incomeAmount || state.expenseAmount) : amountFromInput(state.incomeAmount);
  const expenseAmount = typeIsIncome ? amountFromInput(state.expenseAmount) : amountFromInput(state.expenseAmount || state.incomeAmount);

  return {
    account: state.account || "Manual",
    category: state.category || "Uncategorized",
    currency: state.currency.toUpperCase() || "USD",
    date: state.date,
    description: state.purpose || displaySmartCategory(state.category) || "Manual transaction",
    money_in: incomeAmount,
    money_out: expenseAmount,
    notes: buildNotes(state),
    receipt_link: state.receiptLink,
    receipt_required: state.receiptRequired,
    reconciled: false,
    source: sourceFromState(state),
    tax_line: state.taxCategory || "Needs review",
    vendor: state.merchant || state.counterparty
  };
}

function statusLabel(status?: SmartFieldStatus) {
  if (status === "recognized") return "已识别";
  if (status === "needs_review") return "待确认";
  return "未识别";
}

function statusTone(status?: SmartFieldStatus): "green" | "amber" | "neutral" {
  if (status === "recognized") return "green";
  if (status === "needs_review") return "amber";
  return "neutral";
}

function fieldClass(status?: SmartFieldStatus) {
  if (status === "needs_review") return "border-amber-300 bg-amber-50/45 focus:border-amber-400 focus:ring-amber-200/70";
  if (status === "missing") return "border-slate-300 bg-slate-50/80";
  return "";
}

function parseFieldStatus(
  result: NaturalLanguageParseResult | null,
  field: keyof NaturalLanguageParseResult["fieldConfidence"]
) {
  return result?.fieldConfidence[field];
}

function PreviewItem({
  label,
  status,
  value
}: {
  label: string;
  status?: SmartFieldStatus;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
      </div>
      <p className="mt-2 min-h-5 text-sm font-semibold text-ink">{value || "未识别"}</p>
    </div>
  );
}

function FieldShell({
  children,
  label,
  status
}: {
  children: React.ReactNode;
  label: string;
  status?: SmartFieldStatus;
}) {
  return (
    <label className="space-y-1">
      <span className="flex items-center justify-between gap-2">
        <span className="form-label">{label}</span>
        {status && status !== "recognized" ? (
          <span className="text-[0.68rem] font-semibold text-amber-700">{statusLabel(status)}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  children,
  subtitle,
  title
}: {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function TransactionForm() {
  const router = useRouter();
  const { addTransaction, categories, settings } = useBookkeeping();
  const { categoryLabel, t } = useI18n();
  const quickEntryRef = useRef<HTMLTextAreaElement | null>(null);
  const initialForm = useMemo(
    () => emptyForm(settings.default_account, settings.default_currency),
    [settings.default_account, settings.default_currency]
  );
  const [mode, setMode] = useState<EntryMode>("smart");
  const [form, setForm] = useState<FormState>(initialForm);
  const [quickEntry, setQuickEntry] = useState("");
  const [parseResult, setParseResult] = useState<NaturalLanguageParseResult | null>(null);

  const receiptWarning = form.receiptRequired && form.receiptStatus === "missing" && !form.receiptLink;
  const canSave = Boolean(form.date && form.category && (amountFromInput(form.incomeAmount) > 0 || amountFromInput(form.expenseAmount) > 0));

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "type") {
        if (value === "income" || value === "owner_contribution") {
          next.expenseAmount = "";
        } else {
          next.incomeAmount = "";
        }
      }

      if (key === "receiptStatus") {
        next.receiptRequired = value !== "not_required";
      }

      if (key === "receiptRequired" && value === false) {
        next.receiptStatus = "not_required";
      }

      return next;
    });
  }

  function applyParseResult(result: NaturalLanguageParseResult) {
    setForm((current) => stateFromParse(result, current));
    setParseResult(result);
  }

  function parseQuickEntry(value = quickEntry) {
    const result = parseNaturalLanguageTransaction(value, {
      defaultAccount: settings.default_account,
      defaultCurrency: settings.default_currency
    });

    setQuickEntry(value);
    applyParseResult(result);
  }

  function clearAll() {
    setForm(emptyForm(settings.default_account, settings.default_currency));
    setQuickEntry("");
    setParseResult(null);
    quickEntryRef.current?.focus();
  }

  function save(intent: SaveIntent) {
    if (!canSave) return;

    const transaction = addTransaction(draftFromState(form), {
      reason: "Smart add transaction workflow",
      source: "manual"
    });

    if (intent === "continue") {
      clearAll();
      window.setTimeout(() => quickEntryRef.current?.focus(), 0);
      return;
    }

    if (intent === "receipt") {
      router.push(`/receipts?transaction=${encodeURIComponent(transaction.id)}`);
      return;
    }

    router.push("/transactions");
  }

  const parsed = parseResult?.fields;

  return (
    <div className="space-y-6">
      <SectionCard
        subtitle="输入一句话，系统自动解析日期、类型、分类、金额、支付方式、商家、订单号、票据状态等信息。"
        title="快速录入交易"
      >
        <div className="inline-flex rounded-lg border border-line bg-slate-50 p-1">
          {[
            ["smart", "智能录入"],
            ["sheet", "表格式录入"]
          ].map(([value, label]) => (
            <button
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                mode === value ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"
              }`}
              key={value}
              onClick={() => setMode(value as EntryMode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "smart" ? (
          <div className="space-y-4">
            <textarea
              className="form-textarea min-h-32 text-base leading-7"
              onChange={(event) => {
                setQuickEntry(event.target.value);
                setParseResult(null);
              }}
              placeholder="例如：5月30日 支付广州市心跳潮玩商贸有限公司 2300 元采购库存，用建设银行卡，需收据"
              ref={quickEntryRef}
              value={quickEntry}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!quickEntry.trim()} onClick={() => parseQuickEntry()} variant="primary">
                <Wand2 aria-hidden="true" className="h-4 w-4" />
                解析交易
              </Button>
              <Button onClick={clearAll}>
                <Eraser aria-hidden="true" className="h-4 w-4" />
                清空
              </Button>
              <Button onClick={() => {
                setQuickEntry(examplePhrases[7]);
                quickEntryRef.current?.focus();
              }}>
                <ClipboardList aria-hidden="true" className="h-4 w-4" />
                粘贴示例
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {examplePhrases.map((phrase) => (
                <button
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-marine/30 hover:text-ink"
                  key={phrase}
                  onClick={() => {
                    setQuickEntry(phrase);
                    setParseResult(null);
                    quickEntryRef.current?.focus();
                  }}
                  type="button"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
            <div className="grid min-w-[1180px] grid-cols-[9rem_8rem_11rem_13rem_10rem_10rem_10rem_11rem_12rem_12rem_9rem_7rem_16rem] gap-px bg-line text-sm">
              {["日期", "类型", "分类", "项目/用途", "收入金额", "支出金额", "支付方式", "账户/卡号", "商家/平台", "订单号/发票号", "票据状态", "币种", "备注"].map((label) => (
                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500" key={label}>{label}</div>
              ))}
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("date", event.target.value)} type="date" value={form.date} />
              <select className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("type", event.target.value as SmartTransactionType)} value={form.type}>
                {transactionTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select className="bg-white px-3 py-2 outline-none" onChange={(event) => {
                const category = categories.find((item) => item.name === event.target.value);
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                  receiptRequired: category?.receipt_required_default ?? current.receiptRequired,
                  receiptStatus: category?.receipt_required_default === false ? "not_required" : current.receiptStatus,
                  taxCategory: category?.tax_line ?? current.taxCategory
                }));
              }} value={form.category}>
                {categories.map((category) => <option key={category.id} value={category.name}>{displaySmartCategory(category.name) || categoryLabel(category.name)}</option>)}
              </select>
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("purpose", event.target.value)} value={form.purpose} />
              <input className="bg-white px-3 py-2 outline-none" min="0" onChange={(event) => setField("incomeAmount", event.target.value)} step="0.01" type="number" value={form.incomeAmount} />
              <input className="bg-white px-3 py-2 outline-none" min="0" onChange={(event) => setField("expenseAmount", event.target.value)} step="0.01" type="number" value={form.expenseAmount} />
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("paymentMethod", event.target.value)} value={form.paymentMethod} />
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("account", event.target.value)} value={form.account} />
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("merchant", event.target.value)} value={form.merchant} />
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("orderOrInvoiceNo", event.target.value)} value={form.orderOrInvoiceNo} />
              <select className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("receiptStatus", event.target.value as SmartReceiptStatus)} value={form.receiptStatus}>
                {receiptStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input className="bg-white px-3 py-2 uppercase outline-none" onChange={(event) => setField("currency", event.target.value.toUpperCase())} value={form.currency} />
              <input className="bg-white px-3 py-2 outline-none" onChange={(event) => setField("notes", event.target.value)} value={form.notes} />
            </div>
          </div>
        )}
      </SectionCard>

      {parseResult ? (
        <SectionCard subtitle="已应用到下方表单。请确认待确认或未识别字段后保存。" title="解析结果">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <PreviewItem label="日期" status={parseResult.fieldConfidence.date} value={parsed?.date} />
            <PreviewItem label="类型" status={parseResult.fieldConfidence.type} value={transactionTypeLabel(parsed?.type)} />
            <PreviewItem label="分类" status={parseResult.fieldConfidence.category} value={displaySmartCategory(parsed?.category)} />
            <PreviewItem label="项目/用途" status={parseResult.fieldConfidence.purpose} value={parsed?.purpose} />
            <PreviewItem label="收入金额" status={parseResult.fieldConfidence.incomeAmount} value={parsed?.incomeAmount ? formatCurrency(parsed.incomeAmount, parsed.currency) : ""} />
            <PreviewItem label="支出金额" status={parseResult.fieldConfidence.expenseAmount} value={parsed?.expenseAmount ? formatCurrency(parsed.expenseAmount, parsed.currency) : ""} />
            <PreviewItem label="支付方式" status={parseResult.fieldConfidence.paymentMethod} value={parsed?.paymentMethod} />
            <PreviewItem label="账户/卡号" status={parseResult.fieldConfidence.account} value={parsed?.account} />
            <PreviewItem label="商家/平台" status={parseResult.fieldConfidence.merchant} value={parsed?.merchant} />
            <PreviewItem label="交易对象" status={parseResult.fieldConfidence.counterparty} value={parsed?.counterparty} />
            <PreviewItem label="订单号/发票号" status={parseResult.fieldConfidence.orderOrInvoiceNo} value={parsed?.orderOrInvoiceNo} />
            <PreviewItem label="票据状态" status={parseResult.fieldConfidence.receiptStatus} value={receiptStatusLabel(parsed?.receiptStatus)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => applyParseResult(parseResult)}>
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              应用到表单
            </Button>
            <Button onClick={() => parseQuickEntry()}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              重新解析
            </Button>
            <Button onClick={() => setParseResult(null)}>
              <Eraser aria-hidden="true" className="h-4 w-4" />
              清空解析
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="基础信息">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="日期" status={parseFieldStatus(parseResult, "date")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "date"))}`} onChange={(event) => setField("date", event.target.value)} required type="date" value={form.date} />
            </FieldShell>
            <FieldShell label="类型" status={parseFieldStatus(parseResult, "type")}>
              <select className={`form-input ${fieldClass(parseFieldStatus(parseResult, "type"))}`} onChange={(event) => setField("type", event.target.value as SmartTransactionType)} value={form.type}>
                {transactionTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FieldShell>
            <FieldShell label="分类" status={parseFieldStatus(parseResult, "category")}>
              <select className={`form-input ${fieldClass(parseFieldStatus(parseResult, "category"))}`} onChange={(event) => {
                const category = categories.find((item) => item.name === event.target.value);
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                  receiptRequired: category?.receipt_required_default ?? current.receiptRequired,
                  receiptStatus: category?.receipt_required_default === false ? "not_required" : current.receiptStatus,
                  taxCategory: category?.tax_line ?? current.taxCategory
                }));
              }} value={form.category}>
                {categories.map((category) => <option key={category.id} value={category.name}>{displaySmartCategory(category.name) || categoryLabel(category.name)}</option>)}
              </select>
            </FieldShell>
            <FieldShell label="项目/用途" status={parseFieldStatus(parseResult, "purpose")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "purpose"))}`} onChange={(event) => setField("purpose", event.target.value)} value={form.purpose} />
            </FieldShell>
            <FieldShell label="收入金额" status={parseFieldStatus(parseResult, "incomeAmount")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "incomeAmount"))}`} min="0" onChange={(event) => setField("incomeAmount", event.target.value)} step="0.01" type="number" value={form.incomeAmount} />
            </FieldShell>
            <FieldShell label="支出金额" status={parseFieldStatus(parseResult, "expenseAmount")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "expenseAmount"))}`} min="0" onChange={(event) => setField("expenseAmount", event.target.value)} step="0.01" type="number" value={form.expenseAmount} />
            </FieldShell>
            <FieldShell label="币种" status={parseFieldStatus(parseResult, "currency")}>
              <input className={`form-input uppercase ${fieldClass(parseFieldStatus(parseResult, "currency"))}`} onChange={(event) => setField("currency", event.target.value.toUpperCase())} value={form.currency} />
            </FieldShell>
          </div>
        </SectionCard>

        <SectionCard title="支付与账户">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="支付方式" status={parseFieldStatus(parseResult, "paymentMethod")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "paymentMethod"))}`} list="source-options" onChange={(event) => setField("paymentMethod", event.target.value)} value={form.paymentMethod} />
            </FieldShell>
            <FieldShell label="账户/卡号" status={parseFieldStatus(parseResult, "account")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "account"))}`} list="account-options" onChange={(event) => setField("account", event.target.value)} value={form.account} />
            </FieldShell>
            <FieldShell label="商家/平台" status={parseFieldStatus(parseResult, "merchant")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "merchant"))}`} onChange={(event) => setField("merchant", event.target.value)} value={form.merchant} />
            </FieldShell>
            <FieldShell label="交易对象" status={parseFieldStatus(parseResult, "counterparty")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "counterparty"))}`} onChange={(event) => setField("counterparty", event.target.value)} value={form.counterparty} />
            </FieldShell>
            <FieldShell label="订单号/发票号" status={parseFieldStatus(parseResult, "orderOrInvoiceNo")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "orderOrInvoiceNo"))}`} onChange={(event) => setField("orderOrInvoiceNo", event.target.value)} value={form.orderOrInvoiceNo} />
            </FieldShell>
          </div>
        </SectionCard>

        <SectionCard title="票据与报销">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="票据图片/链接" status={parseFieldStatus(parseResult, "receiptLink")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "receiptLink"))}`} onChange={(event) => setField("receiptLink", event.target.value)} placeholder={t("receiptLinkPlaceholder")} value={form.receiptLink} />
            </FieldShell>
            <FieldShell label="票据状态" status={parseFieldStatus(parseResult, "receiptStatus")}>
              <select className={`form-input ${fieldClass(parseFieldStatus(parseResult, "receiptStatus"))}`} onChange={(event) => setField("receiptStatus", event.target.value as SmartReceiptStatus)} value={form.receiptStatus}>
                {receiptStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FieldShell>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
              <input checked={form.receiptRequired} onChange={(event) => setField("receiptRequired", event.target.checked)} type="checkbox" />
              需要收据
            </label>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
              <input checked={form.reimbursable} onChange={(event) => setField("reimbursable", event.target.checked)} type="checkbox" />
              是否可报销
            </label>
          </div>
          {receiptWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              该交易需要收据，当前票据状态为待补。
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="税务与备注">
          <div className="grid gap-4">
            <FieldShell label="税务归类" status={parseFieldStatus(parseResult, "taxCategory")}>
              <input className={`form-input ${fieldClass(parseFieldStatus(parseResult, "taxCategory"))}`} onChange={(event) => setField("taxCategory", event.target.value)} value={form.taxCategory} />
            </FieldShell>
            <FieldShell label="备注">
              <textarea className="form-textarea min-h-28" onChange={(event) => setField("notes", event.target.value)} value={form.notes} />
            </FieldShell>
          </div>
        </SectionCard>
      </div>

      <datalist id="account-options">
        {[...new Set([...accountOptions, form.account].filter(Boolean))].map((account) => (
          <option key={account} value={account} />
        ))}
      </datalist>
      <datalist id="source-options">
        {[...new Set([...sourceOptions, "银行卡", "PayPal", "微信", "支付宝", form.paymentMethod].filter(Boolean))].map((source) => (
          <option key={source} value={source} />
        ))}
      </datalist>

      <div className="sticky bottom-4 z-10 rounded-xl border border-line bg-white/95 p-4 shadow-command backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">
            {canSave ? "确认无误后保存交易。" : "请至少填写日期、分类和一项金额。"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canSave} onClick={() => save("default")} variant="primary">
              <Save aria-hidden="true" className="h-4 w-4" />
              保存交易
            </Button>
            <Button disabled={!canSave} onClick={() => save("continue")}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              保存并继续录入
            </Button>
            <Button disabled={!canSave} onClick={() => save("receipt")}>
              <FileUp aria-hidden="true" className="h-4 w-4" />
              保存并上传票据
            </Button>
            <button className={buttonClassName("secondary")} onClick={() => router.push("/transactions")} type="button">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
