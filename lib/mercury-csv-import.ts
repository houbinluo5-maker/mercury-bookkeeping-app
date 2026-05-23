import { classifyTransaction } from "@/lib/accounting-rules";
import { categories as seedCategories } from "@/lib/seed-data";
import type { Category, Transaction, TransactionDraft } from "@/lib/types";

export type MercuryImportRow = TransactionDraft & {
  duplicate: boolean;
  duplicateReason?: string;
  imported?: boolean;
  originalAmount: number;
  reference: string;
  rowId: string;
  rowNumber: number;
  selected: boolean;
  status: string;
};

type ParsedMercuryRow = {
  account: string;
  amount: number;
  bankDescription: string;
  counterparty: string;
  currency: string;
  date: string;
  description: string;
  reference: string;
  status: string;
};

const columnAliases = {
  account: ["account", "account name", "bank account"],
  amount: ["amount", "transaction amount", "net amount", "signed amount"],
  bankDescription: ["bank description", "bank descriptor", "statement description"],
  counterparty: ["counterparty", "counter party", "vendor", "payee", "merchant", "recipient", "sender", "name"],
  credit: ["credit", "deposit", "money in", "received"],
  currency: ["currency", "currency code"],
  date: ["date", "transaction date", "posted date", "created date"],
  debit: ["debit", "withdrawal", "money out", "spent"],
  description: ["description", "memo", "details", "transaction description"],
  reference: ["reference", "ref", "transaction id", "transaction uuid", "id"],
  status: ["status", "transaction status"]
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(field.trim());
      field = "";

      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }

      row = [];
      if (char === "\r" && next === "\n") index += 1;
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  return rows;
}

function createHeaderIndexes(headers: string[]) {
  return headers.reduce<Record<string, number>>((acc, header, index) => {
    const normalized = normalizeHeader(header);

    if (normalized && acc[normalized] === undefined) {
      acc[normalized] = index;
    }

    return acc;
  }, {});
}

function pickCell(row: string[], headerIndexes: Record<string, number>, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));

  for (const alias of normalizedAliases) {
    const exactIndex = headerIndexes[alias];

    if (exactIndex !== undefined && row[exactIndex]) return row[exactIndex];
  }

  const fuzzyHeader = Object.keys(headerIndexes).find((header) =>
    normalizedAliases.some((alias) => header.includes(alias) || alias.includes(header))
  );

  if (fuzzyHeader) {
    return row[headerIndexes[fuzzyHeader]] ?? "";
  }

  return "";
}

function parseAmount(value: string) {
  const trimmed = value.trim();
  const isParentheticalNegative = /^\(.*\)$/.test(trimmed);
  const normalized = trimmed.replace(/[,$\s]/g, "").replace(/[()]/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) return 0;

  return isParentheticalNegative ? -Math.abs(amount) : amount;
}

function toIsoDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (usMatch) {
    const year = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];

    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  return [
    String(parsed.getFullYear()),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0")
  ].join("-");
}

function signedAmount(transaction: Pick<TransactionDraft, "money_in" | "money_out">) {
  return transaction.money_in > 0 ? transaction.money_in : -transaction.money_out;
}

function descriptor(value: Pick<TransactionDraft, "description" | "vendor">) {
  return normalizeText(`${value.vendor} ${value.description}`);
}

function descriptorsMatch(left: string, right: string) {
  if (!left || !right) return true;
  if (left === right || left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2));
  const rightTokens = right.split(" ").filter((token) => token.length > 2);
  const matches = rightTokens.filter((token) => leftTokens.has(token)).length;

  return matches / Math.max(1, Math.min(leftTokens.size, rightTokens.length)) >= 0.6;
}

function findDuplicate(row: TransactionDraft, existingTransactions: TransactionDraft[]) {
  const rowAmount = signedAmount(row).toFixed(2);
  const rowAccount = normalizeText(row.account);
  const rowDescriptor = descriptor(row);

  return existingTransactions.find((transaction) => {
    const amountMatches = signedAmount(transaction).toFixed(2) === rowAmount;
    const accountMatches = normalizeText(transaction.account) === rowAccount;
    const dateMatches = transaction.date === row.date;

    return (
      dateMatches &&
      amountMatches &&
      accountMatches &&
      descriptorsMatch(rowDescriptor, descriptor(transaction))
    );
  });
}

function inferSource(text: string, category: string) {
  const normalized = normalizeText(text);

  if (/meta|facebook|instagram/.test(normalized)) return "Meta Ads";
  if (/tiktok/.test(normalized)) return "TikTok Ads";
  if (/shopify/.test(normalized)) return "Shopify";
  if (/supplier|inventory|purchase order|alibaba|factory/.test(normalized)) return "Supplier";
  if (/shipping|shipbob|shipstation|ups|fedex|usps|dhl/.test(normalized)) return "Shipping";
  if (/domain|hosting|namecheap|email|software|subscription|app/.test(normalized)) return "Software";
  if (/owner|personal|member distribution/.test(normalized)) return "Owner";
  if (category === "Bank Fees") return "Mercury";

  return "Mercury";
}

function categoryDefault(categoryList: Category[], categoryName: string) {
  return (
    categoryList.find((category) => category.name === categoryName) ??
    seedCategories.find((category) => category.name === categoryName) ??
    seedCategories.find((category) => category.name === "Uncategorized")
  );
}

function parseMercuryRow(
  row: string[],
  headerIndexes: Record<string, number>,
  defaultAccount: string,
  defaultCurrency: string
): ParsedMercuryRow {
  const description = pickCell(row, headerIndexes, columnAliases.description);
  const bankDescription = pickCell(row, headerIndexes, columnAliases.bankDescription);
  const counterparty = pickCell(row, headerIndexes, columnAliases.counterparty);
  const amount = pickCell(row, headerIndexes, columnAliases.amount);
  const credit = parseAmount(pickCell(row, headerIndexes, columnAliases.credit));
  const debit = parseAmount(pickCell(row, headerIndexes, columnAliases.debit));

  return {
    account: pickCell(row, headerIndexes, columnAliases.account) || defaultAccount,
    amount: amount ? parseAmount(amount) : credit - Math.abs(debit),
    bankDescription,
    counterparty,
    currency: pickCell(row, headerIndexes, columnAliases.currency) || defaultCurrency || "USD",
    date: toIsoDate(pickCell(row, headerIndexes, columnAliases.date)),
    description: description || bankDescription || counterparty,
    reference: pickCell(row, headerIndexes, columnAliases.reference),
    status: pickCell(row, headerIndexes, columnAliases.status)
  };
}

export function parseMercuryCsv(
  text: string,
  existingTransactions: Transaction[],
  categoryList: Category[],
  defaultAccount: string,
  defaultCurrency: string
): MercuryImportRow[] {
  const rows = parseCsv(text);
  const [headers, ...body] = rows;

  if (!headers?.length) return [];

  const headerIndexes = createHeaderIndexes(headers);
  const importRows: MercuryImportRow[] = [];

  body.forEach((rawRow, index) => {
    const parsed = parseMercuryRow(rawRow, headerIndexes, defaultAccount, defaultCurrency);
    const vendor = parsed.counterparty || parsed.bankDescription || parsed.description || "Mercury";
    const description = parsed.description || parsed.bankDescription || parsed.counterparty || "Mercury transaction";
    const moneyIn = parsed.amount > 0 ? parsed.amount : 0;
    const moneyOut = parsed.amount < 0 ? Math.abs(parsed.amount) : 0;
    const baseDraft: TransactionDraft = {
      account: parsed.account,
      category: "Uncategorized",
      currency: parsed.currency || "USD",
      date: parsed.date,
      description,
      money_in: moneyIn,
      money_out: moneyOut,
      notes: "",
      receipt_link: "",
      receipt_required: true,
      reconciled: true,
      source: "Mercury",
      tax_line: "Needs review",
      vendor
    };
    const rule = classifyTransaction(baseDraft);
    const category = categoryDefault(categoryList, rule.category);
    const draft: TransactionDraft = {
      ...baseDraft,
      category: category?.name ?? "Uncategorized",
      notes: [
        "Imported from Mercury CSV.",
        parsed.reference ? `Reference: ${parsed.reference}.` : "",
        parsed.status ? `Bank status: ${parsed.status}.` : "",
        rule.category === "Uncategorized" ? "Needs review: no import rule matched." : rule.reason
      ]
        .filter(Boolean)
        .join(" "),
      receipt_required: category?.receipt_required_default ?? rule.receipt_required,
      reconciled: true,
      source: inferSource(`${vendor} ${description} ${parsed.bankDescription}`, rule.category),
      tax_line: category?.tax_line ?? rule.tax_line
    };
    const duplicate = findDuplicate(draft, [...existingTransactions, ...importRows]);
    const hasRequiredFields = Boolean(draft.date && (draft.money_in > 0 || draft.money_out > 0));

    importRows.push({
      ...draft,
      duplicate: Boolean(duplicate),
      duplicateReason: duplicate
        ? `Possible duplicate of ${duplicate.vendor || duplicate.description} on ${duplicate.date}.`
        : undefined,
      originalAmount: parsed.amount,
      reference: parsed.reference,
      rowId: `mercury-${index + 2}-${normalizeText(parsed.reference || `${vendor}-${description}`)}`,
      rowNumber: index + 2,
      selected: hasRequiredFields && !duplicate,
      status: parsed.status
    });
  });

  return importRows;
}

export function mercuryImportRowToDraft(row: MercuryImportRow): TransactionDraft {
  return {
    account: row.account,
    category: row.category,
    currency: row.currency,
    date: row.date,
    description: row.description,
    money_in: row.money_in,
    money_out: row.money_out,
    notes: row.notes,
    receipt_link: row.receipt_link,
    receipt_required: row.receipt_required,
    reconciled: row.reconciled,
    source: row.source,
    tax_line: row.tax_line,
    vendor: row.vendor
  };
}
