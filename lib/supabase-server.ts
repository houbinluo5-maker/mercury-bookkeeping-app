import {
  buildTransactionAuditLogs,
  createAuditEntry,
  normalizeAuditLogs,
  transactionSummary,
  type TransactionAuditOptions
} from "@/lib/audit";
import {
  changedSensitiveFields,
  monthlyClosingId,
  monthPeriod,
  normalizeMonthlyClosing,
  normalizeMonthlyClosings
} from "@/lib/monthly-closing";
import { categories as seedCategories, defaultSettings } from "@/lib/seed-data";
import {
  getReceiptRequiredDefault,
  normalizeCategoryReceiptDefault
} from "@/lib/receipt-requirements";
import type {
  AppSettings,
  AuditActor,
  AuditLog,
  AuditSource,
  Category,
  LocalBackup,
  MonthlyClosing,
  MonthlyClosingSummaryJson,
  Transaction
} from "@/lib/types";

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

type AuditLogRow = AuditLog;
type MonthlyClosingRow = MonthlyClosing;

type TransactionCreateAuditOptions = {
  actor?: AuditActor;
  reason?: string;
  source?: AuditSource;
};

type TransactionWriteResult = {
  audit_logs: AuditLog[];
  transaction?: Transaction;
  transactions?: Transaction[];
};

type SupabaseErrorBody = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
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
  const category = String(transaction.category ?? "Uncategorized");

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
    category,
    tax_line: String(transaction.tax_line ?? "Needs review"),
    receipt_required:
      typeof transaction.receipt_required === "boolean"
        ? transaction.receipt_required
        : getReceiptRequiredDefault(category),
    receipt_link: String(transaction.receipt_link ?? ""),
    reconciled: Boolean(transaction.reconciled ?? false),
    notes: String(transaction.notes ?? ""),
    created_at: createdAt,
    updated_at: transaction.updated_at || createdAt
  };
}

function normalizeCategory(category: Partial<Category>): Category {
  return normalizeCategoryReceiptDefault({
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
    type: category.type ?? "Expense",
    tax_line: String(category.tax_line ?? "Needs review"),
    receipt_required_default: Boolean(category.receipt_required_default ?? true),
    description: String(category.description ?? "")
  });
}

function normalizeCategories(categories: Partial<Category>[] | null | undefined): Category[] {
  const normalized = Array.isArray(categories)
    ? categories.map((category) => normalizeCategory(category))
    : [];
  const categoryByName = new Map(normalized.map((category) => [category.name, category]));
  const seedCategoryNames = new Set(seedCategories.map((category) => category.name));
  const mergedKnownCategories = seedCategories.map((category) =>
    normalizeCategoryReceiptDefault(categoryByName.get(category.name) ?? category)
  );
  const customCategories = normalized.filter((category) => !seedCategoryNames.has(category.name));

  return [...mergedKnownCategories, ...customCategories];
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

function parseSupabaseBody(text: string): unknown {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function describeSupabaseError(status: number, statusText: string, body: unknown) {
  const errorBody = typeof body === "object" && body !== null ? (body as SupabaseErrorBody) : null;
  const message = errorBody?.message || (typeof body === "string" ? body : "");
  const code = errorBody?.code || "";
  const details = errorBody?.details || "";
  const hint = errorBody?.hint || "";
  const combined = [code, message, details, hint].join(" ").toLowerCase();
  const suffix = [message, details, hint].filter(Boolean).join(" ");

  if (code === "42501" || /permission denied|row-level security|rls/.test(combined)) {
    return `Supabase permission denied. Confirm the app is using the service role key and that the SQL migration was run. HTTP ${status} ${statusText}.${suffix ? ` ${suffix}` : ""}`;
  }

  if (status === 401 || /invalid.*api|api key|jwt|token|signature/.test(combined)) {
    return `Supabase rejected the service role key. Check SUPABASE_SERVICE_ROLE_KEY in the deployment environment. HTTP ${status} ${statusText}.${suffix ? ` ${suffix}` : ""}`;
  }

  if (code === "42P01" || /relation .* does not exist|does not exist|schema cache/.test(combined)) {
    return `Supabase table is missing. Run the SQL migrations in supabase/migrations, including monthly_closings, in the Supabase SQL editor. HTTP ${status} ${statusText}.${suffix ? ` ${suffix}` : ""}`;
  }

  if (!message && !details && !hint) {
    return `Supabase returned an empty error response. HTTP ${status} ${statusText}.`;
  }

  return `Supabase request failed. HTTP ${status} ${statusText}.${suffix ? ` ${suffix}` : ""}`;
}

async function supabaseRequest<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const method = init.method?.toUpperCase() ?? "GET";
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
  const responseText = await response.text();
  const responseBody = parseSupabaseBody(responseText);

  if (!response.ok) {
    throw new Error(describeSupabaseError(response.status, response.statusText, responseBody));
  }

  if (!responseText.trim()) {
    if (method !== "GET" || response.status === 204) {
      return undefined as T;
    }

    throw new Error(
      `Supabase returned an empty successful response for ${path}. HTTP ${response.status} ${response.statusText}.`
    );
  }

  if (typeof responseBody === "string") {
    throw new Error(
      `Supabase returned non-JSON response for ${path}. HTTP ${response.status} ${response.statusText}. ${responseBody.slice(0, 240)}`
    );
  }

  if (responseBody === null) {
    return undefined as T;
  }

  return responseBody as T;
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

async function insertRows<T extends object>(config: SupabaseConfig, table: string, rows: T[]) {
  if (!rows.length) return;

  await supabaseRequest(config, table, {
    method: "POST",
    body: JSON.stringify(rows),
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function insertIgnoreRows<T extends object>(
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
      Prefer: "resolution=ignore-duplicates,return=minimal"
    }
  });
}

async function loadSupabaseTransactionById(config: SupabaseConfig, id: string) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );

  return rows[0] ? normalizeTransaction(rows[0]) : null;
}

async function loadMonthlyClosingById(config: SupabaseConfig, id: string) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    `monthly_closings?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );

  return rows[0] ? normalizeMonthlyClosing(rows[0]) : null;
}

async function loadMonthlyClosingForDate(config: SupabaseConfig, date: string) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    `monthly_closings?select=*&period_start=lte.${encodeURIComponent(date)}&period_end=gte.${encodeURIComponent(date)}&limit=1`
  );

  return rows[0] ? normalizeMonthlyClosing(rows[0]) : null;
}

async function upsertMonthlyClosing(config: SupabaseConfig, closing: MonthlyClosing) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    "monthly_closings?on_conflict=id&select=*",
    {
      method: "POST",
      body: JSON.stringify(closing),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      }
    }
  );

  return normalizeMonthlyClosing(rows[0] ?? closing);
}

async function assertClosedPeriodReason(
  config: SupabaseConfig,
  previous: Transaction,
  patch: Partial<Transaction>,
  audit: TransactionAuditOptions
) {
  const sensitiveFields = changedSensitiveFields(patch);

  if (!sensitiveFields.length) return;

  const [previousClosing, nextClosing] = await Promise.all([
    loadMonthlyClosingForDate(config, previous.date),
    typeof patch.date === "string" ? loadMonthlyClosingForDate(config, patch.date) : null
  ]);
  const touchesClosedPeriod =
    previousClosing?.status === "closed" || nextClosing?.status === "closed";

  if (touchesClosedPeriod && !audit.reason?.trim()) {
    throw new Error("Closed-period changes require an audit reason.");
  }
}

async function insertTransaction(config: SupabaseConfig, transaction: Transaction) {
  const rows = await supabaseRequest<Transaction[]>(config, "transactions?select=*", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Prefer: "return=representation"
    }
  });

  return normalizeTransaction(rows[0] ?? transaction);
}

async function patchTransaction(
  config: SupabaseConfig,
  id: string,
  patch: Partial<Transaction>
) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      headers: {
        Prefer: "return=representation"
      }
    }
  );

  if (!rows[0]) {
    throw new Error("Transaction was not found.");
  }

  return normalizeTransaction(rows[0]);
}

async function deleteTransactionRow(config: SupabaseConfig, id: string) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=representation"
      }
    }
  );

  return rows.map((transaction) => normalizeTransaction(transaction));
}

async function upsertReceiptRow(config: SupabaseConfig, transaction: Transaction) {
  await upsertRows(config, "receipts", toReceiptRows([transaction]), "transaction_id");
}

async function insertRequiredAuditLogs(config: SupabaseConfig, auditLogs: AuditLog[]) {
  const normalizedLogs = normalizeAuditLogs(auditLogs);

  if (!normalizedLogs.length) {
    throw new Error("Transaction write did not create an audit log.");
  }

  const rows = await supabaseRequest<AuditLog[]>(config, "audit_logs?select=*", {
    method: "POST",
    body: JSON.stringify(normalizedLogs),
    headers: {
      Prefer: "return=representation"
    }
  });

  if (rows.length !== normalizedLogs.length) {
    throw new Error("Supabase did not persist every required audit log.");
  }
}

function describeUnknownError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function failedWriteMessage(action: string, error: unknown, rollbackError?: unknown) {
  const rollbackMessage = rollbackError
    ? ` Rollback also failed: ${describeUnknownError(rollbackError)}`
    : "";

  return `${action} failed after a partial Supabase write. ${describeUnknownError(error)}${rollbackMessage}`;
}

export async function createSupabaseTransaction(
  transaction: Transaction,
  audit: TransactionCreateAuditOptions = {}
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = normalizeTransaction(transaction);
  let created: Transaction | null = null;
  const auditLogs = [
    createAuditEntry({
      action: "create",
      actor: audit.actor ?? "admin",
      created_at: new Date().toISOString(),
      entity_id: normalized.id,
      entity_type: "transaction",
      field_name: "",
      new_value: transactionSummary(normalized),
      old_value: "",
      reason: audit.reason || "",
      source: audit.source ?? "manual"
    })
  ];

  try {
    created = await insertTransaction(config, normalized);
    await upsertReceiptRow(config, created);
    await insertRequiredAuditLogs(config, auditLogs);
  } catch (error) {
    if (!created) throw error;

    try {
      await deleteTransactionRow(config, created.id);
    } catch (rollbackError) {
      throw new Error(failedWriteMessage("Transaction create", error, rollbackError));
    }

    throw new Error(failedWriteMessage("Transaction create", error));
  }

  return { audit_logs: auditLogs, transaction: created };
}

export async function updateSupabaseTransaction(
  id: string,
  patch: Partial<Transaction>,
  audit: TransactionAuditOptions = {}
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const previous = await loadSupabaseTransactionById(config, id);

  if (!previous) {
    throw new Error("Transaction was not found.");
  }

  await assertClosedPeriodReason(config, previous, patch, audit);

  const timestamp = new Date().toISOString();
  const preview = normalizeTransaction({
    ...previous,
    ...patch,
    updated_at: previous.updated_at
  });
  const previewAuditLogs = buildTransactionAuditLogs(previous, preview, {
    ...audit,
    createdAt: timestamp
  });

  if (!previewAuditLogs.length) {
    return { audit_logs: [], transaction: previous };
  }

  let updated: Transaction | null = null;

  try {
    updated = await patchTransaction(config, id, {
      ...patch,
      updated_at: timestamp
    });
    const auditLogs = buildTransactionAuditLogs(previous, updated, {
      ...audit,
      createdAt: timestamp
    });

    await upsertReceiptRow(config, updated);
    await insertRequiredAuditLogs(config, auditLogs);

    return { audit_logs: auditLogs, transaction: updated };
  } catch (error) {
    if (!updated) throw error;

    try {
      await patchTransaction(config, id, previous);
      await upsertReceiptRow(config, previous);
    } catch (rollbackError) {
      throw new Error(failedWriteMessage("Transaction update", error, rollbackError));
    }

    throw new Error(failedWriteMessage("Transaction update", error));
  }
}

export async function deleteSupabaseTransaction(
  id: string,
  audit: TransactionCreateAuditOptions = {}
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const previous = await loadSupabaseTransactionById(config, id);

  if (!previous) {
    throw new Error("Transaction was not found.");
  }

  await assertClosedPeriodReason(config, previous, {
    date: previous.date,
    money_in: previous.money_in,
    money_out: previous.money_out
  }, audit);

  const auditLogs = [
    createAuditEntry({
      action: "delete",
      actor: audit.actor ?? "admin",
      created_at: new Date().toISOString(),
      entity_id: previous.id,
      entity_type: "transaction",
      field_name: "",
      new_value: "",
      old_value: transactionSummary(previous),
      reason: audit.reason || "",
      source: audit.source ?? "manual"
    })
  ];

  await insertRequiredAuditLogs(config, auditLogs);

  const deletedRows = await deleteTransactionRow(config, id);

  if (!deletedRows.length) {
    throw new Error("Transaction delete failed after audit log was written.");
  }

  return { audit_logs: auditLogs };
}

export async function importSupabaseTransactions(
  transactions: Transaction[],
  audit: TransactionCreateAuditOptions = {}
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = transactions.map((transaction) => normalizeTransaction(transaction));
  const timestamp = new Date().toISOString();
  const auditLogs = normalized.map((transaction) =>
    createAuditEntry({
      action: "create",
      actor: audit.actor ?? "system",
      created_at: timestamp,
      entity_id: transaction.id,
      entity_type: "transaction",
      field_name: "",
      new_value: transactionSummary(transaction),
      old_value: "",
      reason: audit.reason || transaction.notes || "Imported transaction.",
      source: audit.source ?? "csv_import"
    })
  );

  let transactionsInserted = false;

  try {
    await insertRows(config, "transactions", normalized);
    transactionsInserted = true;
    await upsertRows(config, "receipts", toReceiptRows(normalized), "transaction_id");
    await insertRequiredAuditLogs(config, auditLogs);
  } catch (error) {
    if (!transactionsInserted) throw error;

    try {
      await Promise.all(normalized.map((transaction) => deleteTransactionRow(config, transaction.id)));
    } catch (rollbackError) {
      throw new Error(failedWriteMessage("Transaction import", error, rollbackError));
    }

    throw new Error(failedWriteMessage("Transaction import", error));
  }

  return { audit_logs: auditLogs, transactions: normalized };
}

export async function loadSupabaseBackup(): Promise<LocalBackup> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const [transactionRows, categoryRows, receiptRows, settingsRows, auditLogRows, monthlyClosingRows] = await Promise.all([
    supabaseRequest<Transaction[]>(config, "transactions?select=*&order=date.desc,created_at.desc"),
    supabaseRequest<Category[]>(config, "categories?select=*&order=name.asc"),
    supabaseRequest<ReceiptRow[]>(config, "receipts?select=*"),
    supabaseRequest<CompanySettingsRow[]>(config, "company_settings?select=*&id=eq.default&limit=1"),
    supabaseRequest<AuditLogRow[]>(config, "audit_logs?select=*&order=created_at.desc"),
    supabaseRequest<MonthlyClosingRow[]>(config, "monthly_closings?select=*&order=period_start.desc")
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
    version: 2,
    transactions,
    categories: normalizeCategories(categoryRows.length ? categoryRows : seedCategories),
    receipts: receiptRows,
    audit_logs: normalizeAuditLogs(auditLogRows),
    monthly_closings: normalizeMonthlyClosings(monthlyClosingRows),
    settings: fromSettingsRow(settingsRows[0])
  };
}

export async function loadSupabaseAuditLogs(): Promise<AuditLog[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const auditLogRows = await supabaseRequest<AuditLogRow[]>(
    config,
    "audit_logs?select=*&order=created_at.desc"
  );

  return normalizeAuditLogs(auditLogRows);
}

export async function loadSupabaseMonthlyClosings(): Promise<MonthlyClosing[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    "monthly_closings?select=*&order=period_start.desc"
  );

  return normalizeMonthlyClosings(rows);
}

export async function closeSupabaseMonthlyClosing(
  year: number,
  month: number,
  reason: string,
  readinessScore: number,
  summary: MonthlyClosingSummaryJson
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new Error("Close reason is required.");
  }

  const id = monthlyClosingId(year, month);
  const existing = await loadMonthlyClosingById(config, id);
  const now = new Date().toISOString();
  const { periodEnd, periodStart } = monthPeriod(year, month);
  const closing = normalizeMonthlyClosing({
    ...(existing ?? {}),
    id,
    year,
    month,
    period_start: periodStart,
    period_end: periodEnd,
    status: "closed",
    readiness_score: readinessScore,
    closed_at: now,
    closed_by: "admin",
    close_reason: trimmedReason,
    summary_json: summary,
    created_at: existing?.created_at ?? now,
    updated_at: now
  });
  const auditLog = createAuditEntry({
    action: "update",
    actor: "admin",
    created_at: now,
    entity_id: id,
    entity_type: "reconciliation",
    field_name: "monthly_closing",
    old_value: existing?.status ?? "open",
    new_value: JSON.stringify({
      month,
      readiness_score: readinessScore,
      status: "closed",
      year
    }),
    reason: trimmedReason,
    source: "manual"
  });
  const saved = await upsertMonthlyClosing(config, closing);
  await insertRequiredAuditLogs(config, [auditLog]);

  return { audit_logs: [auditLog], closing: saved };
}

export async function reopenSupabaseMonthlyClosing(
  year: number,
  month: number,
  reason: string
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new Error("Reopen reason is required.");
  }

  const id = monthlyClosingId(year, month);
  const existing = await loadMonthlyClosingById(config, id);
  const now = new Date().toISOString();
  const { periodEnd, periodStart } = monthPeriod(year, month);
  const closing = normalizeMonthlyClosing({
    ...(existing ?? {}),
    id,
    year,
    month,
    period_start: periodStart,
    period_end: periodEnd,
    status: "reopened",
    reopened_at: now,
    reopened_by: "admin",
    reopen_reason: trimmedReason,
    created_at: existing?.created_at ?? now,
    updated_at: now
  });
  const auditLog = createAuditEntry({
    action: "update",
    actor: "admin",
    created_at: now,
    entity_id: id,
    entity_type: "reconciliation",
    field_name: "monthly_closing",
    old_value: existing?.status ?? "closed",
    new_value: "reopened",
    reason: trimmedReason,
    source: "manual"
  });
  const saved = await upsertMonthlyClosing(config, closing);
  await insertRequiredAuditLogs(config, [auditLog]);

  return { audit_logs: [auditLog], closing: saved };
}

export async function updateSupabaseMonthlyClosingSummary(
  year: number,
  month: number,
  summary: MonthlyClosingSummaryJson
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const id = monthlyClosingId(year, month);
  const existing = await loadMonthlyClosingById(config, id);

  if (!existing) {
    throw new Error("Monthly closing record was not found.");
  }

  const saved = await upsertMonthlyClosing(config, {
    ...existing,
    summary_json: summary,
    updated_at: new Date().toISOString()
  });

  return { audit_logs: [], closing: saved };
}

export async function appendSupabaseAuditLogs(entries: AuditLog[]) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalizedEntries = normalizeAuditLogs(entries);

  await insertIgnoreRows(config, "audit_logs", normalizedEntries, "id");

  return loadSupabaseAuditLogs();
}

export async function replaceSupabaseBackup(_backup: LocalBackup): Promise<LocalBackup> {
  void _backup;

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  throw new Error(
    "Full Supabase backup replacement is disabled. Use protected ledger APIs for transaction writes."
  );
}
