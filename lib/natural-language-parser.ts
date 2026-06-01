import { classifyTransaction } from "@/lib/accounting-rules";
import { toDateInputValue } from "@/lib/format";
import { categories } from "@/lib/seed-data";
import type { TransactionDraft } from "@/lib/types";

export type SmartTransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "owner_contribution"
  | "owner_draw"
  | "reimbursement";

export type SmartReceiptStatus = "uploaded" | "missing" | "not_required";
export type SmartFieldStatus = "recognized" | "needs_review" | "missing";

export type SmartParsedTransaction = {
  date?: string;
  type?: SmartTransactionType;
  category?: string;
  purpose?: string;
  incomeAmount?: number;
  expenseAmount?: number;
  currency?: "CNY" | "USD";
  paymentMethod?: string;
  account?: string;
  merchant?: string;
  counterparty?: string;
  orderOrInvoiceNo?: string;
  receiptLink?: string;
  receiptRequired?: boolean;
  receiptStatus?: SmartReceiptStatus;
  reimbursable?: boolean;
  taxCategory?: string;
  notes?: string;
};

export type SmartParsedFieldKey = keyof SmartParsedTransaction;

export type NaturalLanguageParseResult = {
  draft: TransactionDraft;
  fields: SmartParsedTransaction;
  fieldConfidence: Partial<Record<SmartParsedFieldKey, SmartFieldStatus>>;
  fieldReasons: Partial<Record<SmartParsedFieldKey, string>>;
  confidence: number;
  needsReview: boolean;
  issues: string[];
  summary: string;
};

type ParseOptions = {
  defaultAccount: string;
  defaultCurrency: string;
  now?: Date;
};

type AmountResult = {
  amount?: number;
  currency?: "CNY" | "USD";
  matched: boolean;
};

export const sampleNaturalLanguagePhrases = [
  "今天 Meta 广告花费 400 美元",
  "今天 Facebook 广告花费 400 美元",
  "今天收到 Shopify 打款 1260 美元",
  "支付供应商 850 用于库存",
  "支付 Shopify 应用 120",
  "从 Mercury 转 500 到业主个人账户",
  "业主向公司投入 2000",
  "5月30日 支付供应商 2300 元采购库存，用建设银行卡，需收据"
];

const categoryByName = new Map(categories.map((category) => [category.name, category]));

const categoryDisplay: Record<string, string> = {
  "Advertising Expense": "广告费",
  "Bank Fees": "银行手续费",
  "Investment Transfer": "转账",
  "Owner Contribution": "业主投入",
  "Owner Draw / Member Distribution": "业主提取",
  "Payment Processing Fees": "银行手续费",
  "Product Cost / COGS": "库存采购",
  "Revenue": "销售收入",
  "Shipping / Fulfillment": "物流费用",
  "Software Expense": "软件订阅",
  "Uncategorized": "待分类",
  "Website / Hosting": "软件订阅"
};

export function displaySmartCategory(category?: string) {
  if (!category) return "";
  return categoryDisplay[category] ?? category;
}

function normalize(text: string) {
  return text
    .trim()
    .replace(/[，,]/g, "，")
    .replace(/\s+/g, " ");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeDateParts(year: number, month: number, day: number) {
  return toDateInputValue(new Date(year, month - 1, day));
}

function parseDate(input: string, now: Date) {
  const lower = input.toLowerCase();

  if (/今天|\btoday\b/.test(lower)) {
    return { date: toDateInputValue(now), matched: true };
  }

  if (/昨天|\byesterday\b/.test(lower)) {
    return { date: toDateInputValue(addDays(now, -1)), matched: true };
  }

  if (/前天/.test(lower)) {
    return { date: toDateInputValue(addDays(now, -2)), matched: true };
  }

  const isoLike = lower.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoLike) {
    return {
      date: normalizeDateParts(Number(isoLike[1]), Number(isoLike[2]), Number(isoLike[3])),
      matched: true
    };
  }

  const slashDate = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashDate) {
    const year = slashDate[3]
      ? Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3])
      : now.getFullYear();
    return {
      date: normalizeDateParts(year, Number(slashDate[1]), Number(slashDate[2])),
      matched: true
    };
  }

  const chineseDate = input.match(/(?:(20\d{2})年)?\s*(\d{1,2})月\s*(\d{1,2})[日号]?/);
  if (chineseDate) {
    return {
      date: normalizeDateParts(
        chineseDate[1] ? Number(chineseDate[1]) : now.getFullYear(),
        Number(chineseDate[2]),
        Number(chineseDate[3])
      ),
      matched: true
    };
  }

  const monthNameDate = input.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(20\d{2}))?/i
  );
  if (monthNameDate) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.findIndex((name) => monthNameDate[1].toLowerCase().startsWith(name)) + 1;
    return {
      date: normalizeDateParts(Number(monthNameDate[3] ?? now.getFullYear()), month, Number(monthNameDate[2])),
      matched: true
    };
  }

  return { date: toDateInputValue(now), matched: false };
}

function removeDateFragments(input: string) {
  return input
    .replace(/今天|昨天|前天/gi, " ")
    .replace(/\btoday\b|\byesterday\b/gi, " ")
    .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/(?:(20\d{2})年)?\s*\d{1,2}月\s*\d{1,2}[日号]?/g, " ")
    .replace(
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*20\d{2})?/gi,
      " "
    );
}

function parseAmount(input: string, fallbackCurrency: string): AmountResult {
  const cleanInput = removeDateFragments(input);
  const amountMatch = cleanInput.match(
    /(?:\$|¥|rmb\s*|cny\s*|usd\s*)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:元|人民币|美金|美元|usd|cny|rmb|dollars?|bucks?)?/i
  );

  if (!amountMatch) {
    return { matched: false };
  }

  const matchedText = amountMatch[0];
  const hasUsd = /\$|usd|美元|美金|dollars?|bucks?/i.test(matchedText);
  const hasCny = /¥|元|人民币|rmb|cny/i.test(matchedText);
  const fallback = fallbackCurrency.toUpperCase() === "CNY" ? "CNY" : "USD";

  return {
    amount: Number(amountMatch[1].replace(/,/g, "")),
    currency: hasUsd ? "USD" : hasCny ? "CNY" : fallback,
    matched: true
  };
}

function parseTransactionType(input: string): SmartTransactionType | undefined {
  const lower = input.toLowerCase();

  if (/业主投入|业主向公司投入|老板垫资|公司注资|个人打款到公司|老板打入公司/.test(input)) return "owner_contribution";
  if (/业主提取|提现给老板|转到个人账户|转.*个人账户|老板个人账户|业主个人账户|owner personal|personal account|owner draw/.test(lower)) return "owner_draw";
  if (!/不可报销|不报销/.test(input) && /可报销|报销|reimbursement/.test(lower)) return "reimbursement";
  if (/转账|转到|转入|转出|从.+转.+到|transfer/.test(lower)) return "transfer";
  if (/收到|入账|打款|回款|收入|客户付款|销售收入|销售回款|payout|deposit|received|sales/.test(lower)) return "income";
  if (/支付|花费|花了|扣费|采购|广告费|订阅费|购买|用于库存|paid|spent|payment|purchase/.test(lower)) return "expense";

  return undefined;
}

function parseCategory(input: string, type?: SmartTransactionType) {
  const lower = input.toLowerCase();

  if (/meta|facebook|fb 广告|meta ads|google ads|tiktok ads|广告花费|广告费|advertising|ads?/.test(lower)) {
    return "Advertising Expense";
  }

  if (/shopify 应用|shopify app|app 订阅|插件费|软件订阅|月费|subscription|plugin/.test(lower)) {
    return "Software Expense";
  }

  if (/采购库存|进货|拿货|供应商|货款|采购|库存|inventory|supplier/.test(lower)) {
    return "Product Cost / COGS";
  }

  if (/shopify 打款|销售收入|销售回款|客户付款|订单收入|payout|sales/.test(lower)) {
    return "Revenue";
  }

  if (/运费|快递费|物流|shipping|delivery|fulfillment/.test(lower)) return "Shipping / Fulfillment";
  if (/业主投入|业主向公司投入|老板垫资|公司注资|个人打款到公司/.test(lower)) return "Owner Contribution";
  if (/业主提取|提现给老板|转到个人账户|转.*个人账户|老板个人账户|业主个人账户|owner personal|owner draw/.test(lower)) {
    return "Owner Draw / Member Distribution";
  }
  if (/手续费|bank fee|processing fee|paypal/.test(lower)) return "Bank Fees";
  if (type === "income") return "Revenue";
  if (type === "owner_contribution") return "Owner Contribution";
  if (type === "owner_draw") return "Owner Draw / Member Distribution";
  if (type === "transfer") return "Investment Transfer";

  return undefined;
}

function parsePurpose(input: string, category?: string) {
  const lower = input.toLowerCase();

  if (/采购库存/.test(input)) return "采购库存";
  if (/用于库存|库存/.test(input)) return "库存";
  if (/广告花费|广告费/.test(input) || /ad|ads|advertising/.test(lower)) return "广告花费";
  if (/shopify 应用|app|插件|订阅|subscription|plugin/.test(lower)) return "软件订阅";
  if (/手续费|bank fee|processing fee/.test(lower)) return "手续费";
  if (/销售收入|销售回款|打款|payout|sales/.test(lower)) return "销售收入";

  return category ? displaySmartCategory(category) : "";
}

function parsePayment(input: string) {
  const lower = input.toLowerCase();
  const accounts = [
    { pattern: /建设银行卡|建设银行|ccb/i, account: "建设银行卡", method: "银行卡" },
    { pattern: /招商银行卡|招商银行/i, account: "招商银行卡", method: "银行卡" },
    { pattern: /农业银行卡|农业银行/i, account: "农业银行卡", method: "银行卡" },
    { pattern: /mercury 银行|mercury/i, account: "Mercury", method: "银行账户" },
    { pattern: /paypal/i, account: "PayPal", method: "PayPal" },
    { pattern: /shopify balance/i, account: "Shopify Balance", method: "Shopify Balance" },
    { pattern: /现金/.test(input), account: "现金", method: "现金" },
    { pattern: /微信/.test(input), account: "微信", method: "微信" },
    { pattern: /支付宝/.test(input), account: "支付宝", method: "支付宝" },
    { pattern: /信用卡/.test(input), account: "信用卡", method: "信用卡" },
    { pattern: /银行卡/.test(input), account: "", method: "银行卡" }
  ];

  for (const item of accounts) {
    const matched = typeof item.pattern === "boolean" ? item.pattern : item.pattern.test(lower);
    if (matched) return { account: item.account, paymentMethod: item.method };
  }

  return {};
}

function parseMerchant(input: string) {
  const lower = input.toLowerCase();
  const merchantInput = removeDateFragments(input);
  const companyMatch = merchantInput.match(/([\u4e00-\u9fa5A-Za-z0-9（）()·&\-\s]{2,}?有限公司)/);
  const ownerTarget = input.match(/到\s*([^，,]+账户)/);

  if (companyMatch) {
    const company = companyMatch[1]
      .replace(/^.*?(?:支付|付给|向)\s*/, "")
      .replace(/^[，,\s]+/, "")
      .trim();

    return { merchant: company, counterparty: company };
  }

  const platformMatches = [
    { pattern: /meta/i, merchant: "Meta" },
    { pattern: /facebook/i, merchant: "Facebook" },
    { pattern: /google/i, merchant: "Google" },
    { pattern: /tiktok/i, merchant: "TikTok" },
    { pattern: /shopify/i, merchant: "Shopify" },
    { pattern: /paypal/i, merchant: "PayPal" },
    { pattern: /mercury/i, merchant: "Mercury" },
    { pattern: /amazon/i, merchant: "Amazon" }
  ];

  for (const item of platformMatches) {
    if (item.pattern.test(lower)) {
      return { merchant: item.merchant, counterparty: ownerTarget?.[1] };
    }
  }

  const paidTarget = input.match(/支付\s*([^，,]+?)\s*(?:\d|¥|\$|rmb|cny|usd)/i);
  if (paidTarget?.[1]) {
    const target = paidTarget[1].replace(/供应商.*$/, "供应商").trim();
    return { counterparty: target, merchant: target };
  }

  if (/供应商|supplier/i.test(input)) return { counterparty: "供应商" };

  if (ownerTarget?.[1]) return { counterparty: ownerTarget[1] };

  return {};
}

function parseOrderOrInvoice(input: string) {
  const match = input.match(/(?:订单号|发票号|invoice|inv|order|#)\s*[:：#]?\s*([A-Za-z0-9._-]+)/i);
  return match?.[1];
}

function parseReceipt(input: string): Pick<SmartParsedTransaction, "receiptRequired" | "receiptStatus"> {
  if (/无需收据|不需要收据|无需发票|不需要发票/.test(input)) {
    return { receiptRequired: false, receiptStatus: "not_required" };
  }

  if (/已上传收据|已上传发票|有发票|有收据/.test(input)) {
    return { receiptRequired: true, receiptStatus: "uploaded" };
  }

  if (/需收据|需要收据|需发票|待补发票|待补收据|缺票|缺少收据/.test(input)) {
    return { receiptRequired: true, receiptStatus: "missing" };
  }

  return {};
}

function parseReimbursable(input: string) {
  if (/不可报销|不报销/.test(input)) return false;
  if (/可报销|报销|reimbursement/i.test(input)) return true;
  return undefined;
}

function parseReceiptLink(input: string) {
  return input.match(/https?:\/\/\S+/i)?.[0];
}

function sourceFromFields(fields: SmartParsedTransaction) {
  const merchant = fields.merchant?.toLowerCase() ?? "";

  if (merchant.includes("meta")) return "Meta Ads";
  if (merchant.includes("facebook")) return "Facebook Ads";
  if (merchant.includes("tiktok")) return "TikTok Ads";
  if (merchant.includes("shopify")) return "Shopify";
  if (merchant.includes("paypal")) return "PayPal";
  if (merchant.includes("mercury")) return "Mercury";
  if (fields.counterparty === "供应商") return "Supplier";
  if (fields.paymentMethod) return fields.paymentMethod;

  return "Manual";
}

function categoryTaxLine(categoryName?: string) {
  return categoryByName.get(categoryName ?? "")?.tax_line ?? "Needs review";
}

function buildStructuredNotes(fields: SmartParsedTransaction, normalized: string) {
  const lines = [
    fields.paymentMethod ? `支付方式：${fields.paymentMethod}` : "",
    fields.account ? `账户/卡号：${fields.account}` : "",
    fields.counterparty ? `交易对象：${fields.counterparty}` : "",
    fields.orderOrInvoiceNo ? `订单号/发票号：${fields.orderOrInvoiceNo}` : "",
    fields.receiptStatus ? `票据状态：${receiptStatusLabel(fields.receiptStatus)}` : "",
    typeof fields.reimbursable === "boolean" ? `是否可报销：${fields.reimbursable ? "是" : "否"}` : "",
    fields.notes ? `备注：${fields.notes}` : "",
    normalized ? `Parsed from: "${normalized}"` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

export function receiptStatusLabel(status?: SmartReceiptStatus) {
  if (status === "uploaded") return "已上传";
  if (status === "missing") return "待补";
  if (status === "not_required") return "无需";
  return "";
}

export function transactionTypeLabel(type?: SmartTransactionType) {
  const labels: Record<SmartTransactionType, string> = {
    expense: "支出",
    income: "收入",
    owner_contribution: "业主投入",
    owner_draw: "业主提取",
    reimbursement: "报销",
    transfer: "转账"
  };

  return type ? labels[type] : "";
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.7) return "Medium confidence";
  return "Needs review";
}

function fieldStatus(value: unknown, needsReview = false): SmartFieldStatus {
  if (value === undefined || value === null || value === "") return "missing";
  return needsReview ? "needs_review" : "recognized";
}

export function parseNaturalLanguageTransaction(
  input: string,
  options: ParseOptions
): NaturalLanguageParseResult {
  const normalized = normalize(input);
  const now = options.now ?? new Date();
  const parsedDate = parseDate(normalized, now);
  const parsedAmount = parseAmount(normalized, options.defaultCurrency);
  const parsedType = parseTransactionType(normalized);
  const category = parseCategory(normalized, parsedType);
  const purpose = parsePurpose(normalized, category);
  const payment = parsePayment(normalized);
  const merchant = parseMerchant(normalized);
  const receipt = parseReceipt(normalized);
  const receiptLink = parseReceiptLink(normalized);
  const reimbursable = parseReimbursable(normalized);
  const orderOrInvoiceNo = parseOrderOrInvoice(normalized);
  const type = parsedType ?? (parsedAmount.matched ? "expense" : undefined);
  const amount = parsedAmount.amount ?? 0;
  const isIncome = type === "income" || type === "owner_contribution";
  const isExpense = Boolean(type && !isIncome);
  const finalCategory = category ?? (isIncome ? "Revenue" : "Uncategorized");
  const fields: SmartParsedTransaction = {
    account: payment.account || options.defaultAccount,
    category: finalCategory,
    counterparty: merchant.counterparty,
    currency: parsedAmount.currency,
    date: parsedDate.date,
    expenseAmount: isExpense && amount > 0 ? amount : undefined,
    incomeAmount: isIncome && amount > 0 ? amount : undefined,
    merchant: merchant.merchant,
    orderOrInvoiceNo,
    paymentMethod: payment.paymentMethod,
    purpose,
    receiptLink,
    receiptRequired: receipt.receiptRequired,
    receiptStatus: receipt.receiptStatus,
    reimbursable,
    taxCategory: categoryTaxLine(finalCategory),
    type
  };
  const baseDraft: TransactionDraft = {
    account: fields.account || options.defaultAccount,
    category: finalCategory,
    currency: fields.currency ?? (options.defaultCurrency.toUpperCase() === "CNY" ? "CNY" : "USD"),
    date: fields.date ?? toDateInputValue(now),
    description: fields.purpose || displaySmartCategory(finalCategory) || normalized,
    money_in: fields.incomeAmount ?? 0,
    money_out: fields.expenseAmount ?? 0,
    notes: "",
    receipt_link: fields.receiptLink ?? "",
    receipt_required: fields.receiptRequired ?? finalCategory !== "Owner Draw / Member Distribution",
    reconciled: false,
    source: sourceFromFields(fields),
    tax_line: fields.taxCategory ?? "Needs review",
    vendor: fields.merchant || fields.counterparty || ""
  };
  const rule = classifyTransaction(baseDraft);
  const draft = {
    ...baseDraft,
    category: finalCategory === "Uncategorized" ? rule.category : finalCategory,
    receipt_required: fields.receiptRequired ?? rule.receipt_required,
    tax_line: fields.taxCategory ?? rule.tax_line
  };
  const issues: string[] = [];

  if (!normalized) issues.push("Enter a transaction sentence.");
  if (!parsedDate.matched) issues.push("No date was found; using today.");
  if (!parsedAmount.matched || amount <= 0) issues.push("Amount was not found.");
  if (!parsedType) issues.push("Transaction type needs confirmation.");
  if (!category) issues.push("Category needs confirmation.");

  const fieldConfidence: NaturalLanguageParseResult["fieldConfidence"] = {
    account: fieldStatus(fields.account, !payment.account),
    category: fieldStatus(fields.category, !category),
    counterparty: fieldStatus(fields.counterparty),
    currency: fieldStatus(fields.currency, !/[¥$]|元|人民币|rmb|cny|美元|美金|usd/i.test(normalized)),
    date: fieldStatus(fields.date, !parsedDate.matched),
    expenseAmount: fieldStatus(fields.expenseAmount, isExpense && !parsedAmount.matched),
    incomeAmount: fieldStatus(fields.incomeAmount, isIncome && !parsedAmount.matched),
    merchant: fieldStatus(fields.merchant),
    orderOrInvoiceNo: fieldStatus(fields.orderOrInvoiceNo),
    paymentMethod: fieldStatus(fields.paymentMethod, Boolean(payment.paymentMethod && !payment.account)),
    purpose: fieldStatus(fields.purpose, !purpose),
    receiptLink: fieldStatus(fields.receiptLink),
    receiptRequired: fieldStatus(fields.receiptRequired),
    receiptStatus: fieldStatus(fields.receiptStatus),
    reimbursable: fieldStatus(fields.reimbursable),
    taxCategory: fieldStatus(fields.taxCategory),
    type: fieldStatus(fields.type, !parsedType)
  };
  fields.notes = buildStructuredNotes(fields, normalized);
  draft.notes = fields.notes ?? "";

  const recognizedCount = Object.values(fieldConfidence).filter((status) => status === "recognized").length;
  const needsReviewCount = Object.values(fieldConfidence).filter((status) => status === "needs_review").length;
  const confidence = Math.min(0.98, Math.max(0.25, (recognizedCount * 0.06) + (needsReviewCount * 0.025)));
  const needsReview = issues.some((issue) => issue !== "No date was found; using today.") ||
    Object.values(fieldConfidence).includes("needs_review");

  return {
    confidence,
    draft,
    fieldConfidence,
    fieldReasons: {},
    fields,
    issues,
    needsReview,
    summary: confidenceLabel(confidence)
  };
}
