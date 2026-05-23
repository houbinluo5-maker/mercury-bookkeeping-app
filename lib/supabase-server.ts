import { categories as seedCategories, defaultSettings } from "@/lib/seed-data";
import type { AppSettings, Category, LocalBackup, Transaction } from "@/lib/types";

type SupabaseConfig = {
  serviceRoleKey: string;
  url: string;
};

type CompanySettingsRow = {
  id: "default";
  company_name: string;
  tax_year: number;
  default_currency: string;
  default_account_name: string;
  bookkeeping_method: "cash" | "accrual";
  business_type: string;
  tax_notes: string;
  language: AppSettings["language"];
};

type ReceiptRow = {
  transaction_id: string;
  receipt_required: boolean;
  receipt_link: string;
  reconciled: boolean;
};

function normalizeSupabaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) return null;

  return {
    serviceRoleKey,
    url: normalizeSupabaseUrl(url)
  };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

function normalizeSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    ...defaultSettings,
    ...settings
  };
}

function normalizeTransaction(transaction: Partial<Transaction>): Transaction {
  const createdAt = transaction.created_at || new Date().toISOString();

  return {
    id: String(transaction.id ?? `txn-${Date.now()}`),
    date: String(transaction.date ?? ""),
    account: String(transaction.account ?? ""),
    source: String(transaction.source ?? "Manual"),
    vendor: String(transaction.vendor ?? ""),
    description: String(transaction.description ?? ""),
    currency: String(transaction.currency ?? "USD"),
    money_in: Number(transaction.money_in ?? 0),
    money_out: Number(transaction.money_out ?? 0),
    category: String(transaction.category ?? "Uncategorized"),
    tax_line: String(transaction.tax_line ?? "Needs review"),
    receipt_required: Boolean(transaction.receipt_required ?? true),
    receipt_link: String(transaction.receipt_link ?? ""),
    reconciled: Boolean(transaction.reconciled ?? false),
    notes: String(transaction.notes ?? ""),
    created_at: createdAt,
    updated_at: transaction.updated_at || createdAt
  };
}

function normalizeCategory(category: Partial<Category>): Category {
  return {
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
    type: category.type ?? "Expense",
    tax_line: String(category.tax_line ?? "Needs review"),
    receipt_required_default: Boolean(category.receipt_required_default ?? true),
    description: String(category.description ?? "")
  };
}

function normalizeBackup(backup: Partial<LocalBackup>): LocalBackup {
  const transactions = Array.isArray(backup.transactions)
    ? backup.transactions.map((transaction) => normalizeTransaction(transaction))
    : [];

  return {
    exported_at: backup.exported_at || new Date().toISOString(),
    version: 1,
    transactions,
    categories: Array.isArray(backup.categories)
      ? backup.categories.map((category) => normalizeCategory(category))
      : seedCategories,
    receipts: Array.isArray(backup.receipts)
      ? backup.receipts
      : transactions.map((transaction) => ({
          transaction_id: transaction.id,
          receipt_required: transaction.receipt_required,
          receipt_link: transaction.receipt_link,
          reconciled: transaction.reconciled
        })),
    settings: normalizeSettings(backup.settings)
  };
}

function toSettingsRow(settings: AppSettings): CompanySettingsRow {
  return {
    id: "default",
    company_name: settings.company_name,
    tax_year: settings.tax_year,
    default_currency: settings.default_currency,
    default_account_name: settings.default_account,
    bookkeeping_method: settings.bookkeeping_method,
    business_type: settings.entity_type,
    tax_notes: settings.business_type_tax_notes,
    language: settings.language
  };
}

function fromSettingsRow(row: Partial<CompanySettingsRow> | null | undefined): AppSettings {
  if (!row) return defaultSettings;

  return normalizeSettings({
    company_name: row.company_name,
    tax_year: row.tax_year,
    default_currency: row.default_currency,
    default_account: row.default_account_name,
    bookkeeping_method: row.bookkeeping_method,
    entity_type: row.business_type,
    business_type_tax_notes: row.tax_notes,
    language: row.language
  });
}

function toReceiptRows(transactions: Transaction[]): ReceiptRow[] {
  return transactions.map((transaction) => ({
    transaction_id: transaction.id,
    receipt_required: transaction.receipt_required,
    receipt_link: transaction.receipt_link,
    reconciled: transaction.reconciled
  }));
}

async function supabaseRequest<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function deleteAllRows(config: SupabaseConfig, table: string, column: string) {
  await supabaseRequest(config, `${table}?${column}=not.is.null`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function upsertRows<T extends object>(
  config: SupabaseConfig,
  table: string,
  rows: T[],
  conflictColumn: string
) {
  if (!rows.length) return;

  await supabaseRequest(config, `${table}?on_conflict=${conflictColumn}`, {
    method: "POST",
    body: JSON.stringify(rows),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    }
  });
}

async function upsertSettings(config: SupabaseConfig, settings: AppSettings) {
  await supabaseRequest(config, "company_settings?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(toSettingsRow(settings)),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    }
  });
}

export async function loadSupabaseBackup(): Promise<LocalBackup> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const [transactionRows, categoryRows, receiptRows, settingsRows] = await Promise.all([
    supabaseRequest<Transaction[]>(config, "transactions?select=*&order=date.desc,created_at.desc"),
    supabaseRequest<Category[]>(config, "categories?select=*&order=name.asc"),
    supabaseRequest<ReceiptRow[]>(config, "receipts?select=*"),
    supabaseRequest<CompanySettingsRow[]>(config, "company_settings?select=*&id=eq.default&limit=1")
  ]);

  const receiptByTransaction = new Map(
    receiptRows.map((receipt) => [receipt.transaction_id, receipt])
  );
  const transactions = transactionRows.map((transaction) => {
    const receipt = receiptByTransaction.get(transaction.id);

    return normalizeTransaction({
      ...transaction,
      receipt_required: receipt?.receipt_required ?? transaction.receipt_required,
      receipt_link: receipt?.receipt_link ?? transaction.receipt_link,
      reconciled: receipt?.reconciled ?? transaction.reconciled
    });
  });

  return {
    exported_at: new Date().toISOString(),
    version: 1,
    transactions,
    categories: categoryRows.length ? categoryRows.map((category) => normalizeCategory(category)) : seedCategories,
    receipts: receiptRows,
    settings: fromSettingsRow(settingsRows[0])
  };
}

export async function replaceSupabaseBackup(backup: LocalBackup): Promise<LocalBackup> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = normalizeBackup(backup);
  const transactions = normalized.transactions.map((transaction) =>
    normalizeTransaction({
      ...transaction,
      updated_at: new Date().toISOString()
    })
  );

  await deleteAllRows(config, "receipts", "transaction_id");
  await deleteAllRows(config, "transactions", "id");
  await deleteAllRows(config, "categories", "id");

  await upsertRows(config, "categories", normalized.categories, "id");
  await upsertRows(config, "transactions", transactions, "id");
  await upsertRows(config, "receipts", toReceiptRows(transactions), "transaction_id");
  await upsertSettings(config, normalized.settings);

  return loadSupabaseBackup();
}
