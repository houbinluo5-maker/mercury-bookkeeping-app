import {
  buildTransactionAuditLogs,
  createAuditEntry,
  normalizeAuditLogs,
  transactionAuditDetails,
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
  SupabaseHealthCheck,
  Transaction,
  WorkspaceRole
} from "@/lib/types";

type SupabaseConfig = {
  serviceRoleKey: string;
  url: string;
};

type CompanySettingsRow = {
  id: "default";
  workspace_id?: string;
  workspace_name?: string;
  company_name: string;
  company_legal_name?: string;
  dba_name?: string;
  business_model?: string;
  tax_year: number;
  default_currency: string;
  default_account_name: string;
  bookkeeping_method: "cash" | "accrual";
  business_type: string;
  ein_tax_id?: string;
  registered_state?: string;
  business_address?: string;
  contact_email?: string;
  finance_contact_name?: string;
  tax_notes: string;
  country_region?: string;
  timezone_display?: AppSettings["timezone_display"];
  language: AppSettings["language"];
  require_receipts_over_threshold?: boolean;
  receipt_required_threshold_amount?: number;
  monthly_close_reminder_day?: number;
  lock_closed_months?: boolean;
  allow_admins_reopen_months?: boolean;
  cpa_read_only_note?: string;
  default_category_fallback?: string;
  data_retention_policy?: AppSettings["data_retention_policy"];
  receipt_retention_policy?: AppSettings["receipt_retention_policy"];
  export_watermark_preference?: AppSettings["export_watermark_preference"];
};

type ReceiptRow = {
  transaction_id: string;
  workspace_id?: string;
  receipt_required: boolean;
  receipt_link: string;
  reconciled: boolean;
};

type AuditLogRow = AuditLog;
type MonthlyClosingRow = MonthlyClosing;

type TransactionCreateAuditOptions = {
  actor?: AuditActor;
  actorEmail?: string;
  actorRole?: WorkspaceRole | "unknown";
  actorUserId?: string;
  reason?: string;
  source?: AuditSource;
  workspaceId?: string;
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

function workspaceFilter(workspaceId?: string) {
  return workspaceId ? `&workspace_id=eq.${encodeURIComponent(workspaceId)}` : "";
}

function withWorkspace<T extends object>(value: T, workspaceId?: string): T & { workspace_id?: string } {
  return workspaceId ? { ...value, workspace_id: workspaceId } : value;
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

function isMissingTableError(error: unknown) {
  return error instanceof Error && /table is missing|does not exist|schema cache|42P01/i.test(error.message);
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
    workspace_name: row.workspace_name,
    company_name: row.company_name,
    company_legal_name: row.company_legal_name,
    dba_name: row.dba_name,
    business_type: row.business_model,
    tax_year: row.tax_year,
    default_currency: row.default_currency,
    default_account: row.default_account_name,
    bookkeeping_method: row.bookkeeping_method,
    entity_type: row.business_type,
    ein_tax_id: row.ein_tax_id,
    registered_state: row.registered_state,
    business_address: row.business_address,
    contact_email: row.contact_email,
    finance_contact_name: row.finance_contact_name,
    business_type_tax_notes: row.tax_notes,
    country_region: row.country_region,
    timezone_display: row.timezone_display,
    language: row.language,
    require_receipts_over_threshold: row.require_receipts_over_threshold,
    receipt_required_threshold_amount: row.receipt_required_threshold_amount,
    monthly_close_reminder_day: row.monthly_close_reminder_day,
    lock_closed_months: row.lock_closed_months,
    allow_admins_reopen_months: row.allow_admins_reopen_months,
    cpa_read_only_note: row.cpa_read_only_note,
    default_category_fallback: row.default_category_fallback,
    data_retention_policy: row.data_retention_policy,
    receipt_retention_policy: row.receipt_retention_policy,
    export_watermark_preference: row.export_watermark_preference
  });
}

function toSettingsRow(settings: AppSettings, workspaceId?: string): CompanySettingsRow {
  return {
    id: "default",
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
    workspace_name: settings.workspace_name,
    company_name: settings.company_name,
    company_legal_name: settings.company_legal_name,
    dba_name: settings.dba_name,
    business_model: settings.business_type,
    tax_year: settings.tax_year,
    default_currency: settings.default_currency,
    default_account_name: settings.default_account,
    bookkeeping_method: settings.bookkeeping_method,
    business_type: settings.entity_type,
    ein_tax_id: settings.ein_tax_id,
    registered_state: settings.registered_state,
    business_address: settings.business_address,
    contact_email: settings.contact_email,
    finance_contact_name: settings.finance_contact_name,
    tax_notes: settings.business_type_tax_notes,
    country_region: settings.country_region,
    timezone_display: settings.timezone_display,
    language: settings.language,
    require_receipts_over_threshold: settings.require_receipts_over_threshold,
    receipt_required_threshold_amount: settings.receipt_required_threshold_amount,
    monthly_close_reminder_day: settings.monthly_close_reminder_day,
    lock_closed_months: settings.lock_closed_months,
    allow_admins_reopen_months: settings.allow_admins_reopen_months,
    cpa_read_only_note: settings.cpa_read_only_note,
    default_category_fallback: settings.default_category_fallback,
    data_retention_policy: settings.data_retention_policy,
    receipt_retention_policy: settings.receipt_retention_policy,
    export_watermark_preference: settings.export_watermark_preference
  };
}

function toReceiptRows(transactions: Transaction[], workspaceId?: string): ReceiptRow[] {
  return transactions.map((transaction) => ({
    transaction_id: transaction.id,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
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

async function checkTableReachable(config: SupabaseConfig, table: string) {
  await supabaseRequest<unknown[]>(config, `${table}?select=*&limit=1`);
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthCheck> {
  const checkedAt = new Date().toISOString();
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return {
      audit_logs: "error",
      checked_at: checkedAt,
      connected: false,
      error: !url
        ? "SUPABASE_URL is not configured."
        : "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      monthly_closings: "error",
      service_role_key: serviceRoleKey ? "ok" : "missing",
      supabase_url: url ? "ok" : "missing",
      transactions: "error"
    };
  }

  const config = {
    serviceRoleKey,
    url: normalizeSupabaseUrl(url)
  };
  const health: SupabaseHealthCheck = {
    audit_logs: "error",
    checked_at: checkedAt,
    connected: false,
    error: "",
    monthly_closings: "error",
    service_role_key: "ok",
    supabase_url: "ok",
    transactions: "error"
  };
  const errors: string[] = [];

  try {
    await checkTableReachable(config, "transactions");
    health.transactions = "ok";
  } catch (error) {
    health.service_role_key = /service role key|api key|jwt|token|signature/i.test(
      error instanceof Error ? error.message : ""
    )
      ? "error"
      : health.service_role_key;
    errors.push(error instanceof Error ? error.message : "Transactions table check failed.");
  }

  try {
    await checkTableReachable(config, "audit_logs");
    health.audit_logs = "ok";
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Audit logs table check failed.");
  }

  try {
    await checkTableReachable(config, "monthly_closings");
    health.monthly_closings = "ok";
  } catch (error) {
    if (isMissingTableError(error)) {
      health.monthly_closings = "missing";
    } else {
      errors.push(error instanceof Error ? error.message : "Monthly closings table check failed.");
    }
  }

  health.connected =
    health.supabase_url === "ok" &&
    health.service_role_key === "ok" &&
    health.transactions === "ok" &&
    health.audit_logs === "ok" &&
    (health.monthly_closings === "ok" || health.monthly_closings === "missing");
  health.error = errors.join(" ");

  return health;
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

async function loadSupabaseTransactionById(config: SupabaseConfig, id: string, workspaceId?: string) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?select=*&id=eq.${encodeURIComponent(id)}${workspaceFilter(workspaceId)}&limit=1`
  );

  return rows[0] ? normalizeTransaction(rows[0]) : null;
}

async function loadMonthlyClosingById(config: SupabaseConfig, id: string, workspaceId?: string) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    `monthly_closings?select=*&id=eq.${encodeURIComponent(id)}${workspaceFilter(workspaceId)}&limit=1`
  );

  return rows[0] ? normalizeMonthlyClosing(rows[0]) : null;
}

async function loadMonthlyClosingForDate(config: SupabaseConfig, date: string, workspaceId?: string) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    `monthly_closings?select=*&period_start=lte.${encodeURIComponent(date)}&period_end=gte.${encodeURIComponent(date)}${workspaceFilter(workspaceId)}&limit=1`
  );

  return rows[0] ? normalizeMonthlyClosing(rows[0]) : null;
}

async function upsertMonthlyClosing(config: SupabaseConfig, closing: MonthlyClosing, workspaceId?: string) {
  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    "monthly_closings?on_conflict=id&select=*",
    {
      method: "POST",
      body: JSON.stringify(withWorkspace(closing, workspaceId)),
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
  audit: TransactionAuditOptions,
  workspaceId?: string
) {
  const sensitiveFields = changedSensitiveFields(patch);

  if (!sensitiveFields.length) return;

  const [previousClosing, nextClosing] = await Promise.all([
    loadMonthlyClosingForDate(config, previous.date, workspaceId),
    typeof patch.date === "string" ? loadMonthlyClosingForDate(config, patch.date, workspaceId) : null
  ]);
  const touchesClosedPeriod =
    previousClosing?.status === "closed" || nextClosing?.status === "closed";

  if (touchesClosedPeriod && !audit.reason?.trim()) {
    throw new Error("Closed-period changes require an audit reason.");
  }
}

async function insertTransaction(config: SupabaseConfig, transaction: Transaction, workspaceId?: string) {
  const rows = await supabaseRequest<Transaction[]>(config, "transactions?select=*", {
    method: "POST",
    body: JSON.stringify(withWorkspace(transaction, workspaceId)),
    headers: {
      Prefer: "return=representation"
    }
  });

  return normalizeTransaction(rows[0] ?? transaction);
}

async function patchTransaction(
  config: SupabaseConfig,
  id: string,
  patch: Partial<Transaction>,
  workspaceId?: string
) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?id=eq.${encodeURIComponent(id)}${workspaceFilter(workspaceId)}&select=*`,
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

async function deleteTransactionRow(config: SupabaseConfig, id: string, workspaceId?: string) {
  const rows = await supabaseRequest<Transaction[]>(
    config,
    `transactions?id=eq.${encodeURIComponent(id)}${workspaceFilter(workspaceId)}&select=*`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=representation"
      }
    }
  );

  return rows.map((transaction) => normalizeTransaction(transaction));
}

async function upsertReceiptRow(config: SupabaseConfig, transaction: Transaction, workspaceId?: string) {
  await upsertRows(config, "receipts", toReceiptRows([transaction], workspaceId), "transaction_id");
}

async function insertRequiredAuditLogs(config: SupabaseConfig, auditLogs: AuditLog[], workspaceId?: string) {
  const normalizedLogs = normalizeAuditLogs(auditLogs);

  if (!normalizedLogs.length) {
    throw new Error("Transaction write did not create an audit log.");
  }

  const rows = await supabaseRequest<AuditLog[]>(config, "audit_logs?select=*", {
    method: "POST",
    body: JSON.stringify(normalizedLogs.map((log) => withWorkspace(log, workspaceId))),
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

function auditContext(
  audit: TransactionCreateAuditOptions | TransactionAuditOptions = {},
  workspaceId?: string
) {
  return {
    actor_email: audit.actorEmail,
    actor_role: audit.actorRole,
    actor_user_id: audit.actorUserId,
    workspace_id: audit.workspaceId ?? workspaceId
  };
}

export async function createSupabaseTransaction(
  transaction: Transaction,
  audit: TransactionCreateAuditOptions = {},
  workspaceId?: string
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = normalizeTransaction(withWorkspace(transaction, workspaceId));
  let created: Transaction | null = null;
  const auditLogs = [
    createAuditEntry({
      action: "create",
      actor: audit.actor ?? "admin",
      ...auditContext(audit, workspaceId),
      created_at: new Date().toISOString(),
      details: transactionAuditDetails(normalized, { result: "success" }),
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
    created = await insertTransaction(config, normalized, workspaceId);
    await upsertReceiptRow(config, created, workspaceId);
    await insertRequiredAuditLogs(config, auditLogs, workspaceId);
  } catch (error) {
    if (!created) throw error;

    try {
      await deleteTransactionRow(config, created.id, workspaceId);
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
  audit: TransactionAuditOptions = {},
  workspaceId?: string
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const previous = await loadSupabaseTransactionById(config, id, workspaceId);

  if (!previous) {
    throw new Error("Transaction was not found.");
  }

  await assertClosedPeriodReason(config, previous, patch, audit, workspaceId);

  const timestamp = new Date().toISOString();
  const preview = normalizeTransaction({
    ...previous,
    ...patch,
    updated_at: previous.updated_at
  });
  const previewAuditLogs = buildTransactionAuditLogs(previous, preview, {
    ...audit,
    createdAt: timestamp,
    workspaceId
  });

  if (!previewAuditLogs.length) {
    return { audit_logs: [], transaction: previous };
  }

  let updated: Transaction | null = null;

  try {
    updated = await patchTransaction(config, id, {
      ...patch,
      updated_at: timestamp
    }, workspaceId);
    const auditLogs = buildTransactionAuditLogs(previous, updated, {
      ...audit,
      createdAt: timestamp,
      workspaceId
    });

    await upsertReceiptRow(config, updated, workspaceId);
    await insertRequiredAuditLogs(config, auditLogs, workspaceId);

    return { audit_logs: auditLogs, transaction: updated };
  } catch (error) {
    if (!updated) throw error;

    try {
      await patchTransaction(config, id, previous, workspaceId);
      await upsertReceiptRow(config, previous, workspaceId);
    } catch (rollbackError) {
      throw new Error(failedWriteMessage("Transaction update", error, rollbackError));
    }

    throw new Error(failedWriteMessage("Transaction update", error));
  }
}

export async function deleteSupabaseTransaction(
  id: string,
  audit: TransactionCreateAuditOptions = {},
  workspaceId?: string
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const previous = await loadSupabaseTransactionById(config, id, workspaceId);

  if (!previous) {
    throw new Error("Transaction was not found.");
  }

  await assertClosedPeriodReason(config, previous, {
    date: previous.date,
    money_in: previous.money_in,
    money_out: previous.money_out
  }, audit, workspaceId);

  const auditLogs = [
    createAuditEntry({
      action: "delete",
      actor: audit.actor ?? "admin",
      ...auditContext(audit, workspaceId),
      created_at: new Date().toISOString(),
      details: transactionAuditDetails(previous, { result: "success" }),
      entity_id: previous.id,
      entity_type: "transaction",
      field_name: "",
      new_value: "",
      old_value: transactionSummary(previous),
      reason: audit.reason || "",
      source: audit.source ?? "manual"
    })
  ];

  await insertRequiredAuditLogs(config, auditLogs, workspaceId);

  const deletedRows = await deleteTransactionRow(config, id, workspaceId);

  if (!deletedRows.length) {
    throw new Error("Transaction delete failed after audit log was written.");
  }

  return { audit_logs: auditLogs };
}

export async function importSupabaseTransactions(
  transactions: Transaction[],
  audit: TransactionCreateAuditOptions = {},
  workspaceId?: string
): Promise<TransactionWriteResult> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalized = transactions.map((transaction) => normalizeTransaction(withWorkspace(transaction, workspaceId)));
  const timestamp = new Date().toISOString();
  const auditLogs = normalized.map((transaction) =>
    createAuditEntry({
      action: "create",
      actor: audit.actor ?? "system",
      ...auditContext(audit, workspaceId),
      created_at: timestamp,
      details: transactionAuditDetails(transaction, {
        result: "success",
        source: audit.source ?? "csv_import"
      }),
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
    await insertRows(config, "transactions", normalized.map((transaction) => withWorkspace(transaction, workspaceId)));
    transactionsInserted = true;
    await upsertRows(config, "receipts", toReceiptRows(normalized, workspaceId), "transaction_id");
    await insertRequiredAuditLogs(config, auditLogs, workspaceId);
  } catch (error) {
    if (!transactionsInserted) throw error;

    try {
      await Promise.all(normalized.map((transaction) => deleteTransactionRow(config, transaction.id, workspaceId)));
    } catch (rollbackError) {
      throw new Error(failedWriteMessage("Transaction import", error, rollbackError));
    }

    throw new Error(failedWriteMessage("Transaction import", error));
  }

  return { audit_logs: auditLogs, transactions: normalized };
}

export async function loadSupabaseBackup(workspaceId?: string): Promise<LocalBackup> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const [transactionRows, categoryRows, receiptRows, settingsRows, auditLogRows, monthlyClosingRows] = await Promise.all([
    supabaseRequest<Transaction[]>(config, `transactions?select=*${workspaceFilter(workspaceId)}&order=date.desc,created_at.desc`),
    supabaseRequest<Category[]>(config, `categories?select=*${workspaceFilter(workspaceId)}&order=name.asc`),
    supabaseRequest<ReceiptRow[]>(config, `receipts?select=*${workspaceFilter(workspaceId)}`),
    supabaseRequest<CompanySettingsRow[]>(config, `company_settings?select=*&id=eq.default${workspaceFilter(workspaceId)}&limit=1`),
    supabaseRequest<AuditLogRow[]>(config, `audit_logs?select=*${workspaceFilter(workspaceId)}&order=created_at.desc`),
    supabaseRequest<MonthlyClosingRow[]>(config, `monthly_closings?select=*${workspaceFilter(workspaceId)}&order=period_start.desc`)
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

export async function loadSupabaseSettings(workspaceId?: string): Promise<AppSettings> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const rows = await supabaseRequest<CompanySettingsRow[]>(
    config,
    `company_settings?select=*&id=eq.default${workspaceFilter(workspaceId)}&limit=1`
  );

  return fromSettingsRow(rows[0]);
}

export async function updateSupabaseSettings(
  settings: AppSettings,
  auditLogs: AuditLog[],
  workspaceId?: string
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalizedSettings = normalizeSettings(settings);
  const conflictColumns = workspaceId ? "workspace_id,id" : "id";
  const rows = await supabaseRequest<CompanySettingsRow[]>(
    config,
    `company_settings?on_conflict=${conflictColumns}&select=*`,
    {
      method: "POST",
      body: JSON.stringify([toSettingsRow(normalizedSettings, workspaceId)]),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      }
    }
  );

  await insertIgnoreRows(
    config,
    "audit_logs",
    normalizeAuditLogs(auditLogs).map((entry) => withWorkspace(entry, workspaceId)),
    "id"
  );

  return {
    audit_logs: normalizeAuditLogs(auditLogs),
    settings: fromSettingsRow(rows[0])
  };
}

export async function loadSupabaseAuditLogs(
  workspaceId?: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AuditLog[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const limit = Math.max(1, Math.min(500, Math.floor(options.limit ?? 100)));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const auditLogRows = await supabaseRequest<AuditLogRow[]>(
    config,
    `audit_logs?select=*${workspaceFilter(workspaceId)}&order=created_at.desc&limit=${limit}&offset=${offset}`
  );

  return normalizeAuditLogs(auditLogRows);
}

export async function loadSupabaseMonthlyClosings(workspaceId?: string): Promise<MonthlyClosing[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const rows = await supabaseRequest<MonthlyClosingRow[]>(
    config,
    `monthly_closings?select=*${workspaceFilter(workspaceId)}&order=period_start.desc`
  );

  return normalizeMonthlyClosings(rows);
}

export async function closeSupabaseMonthlyClosing(
  year: number,
  month: number,
  reason: string,
  readinessScore: number,
  summary: MonthlyClosingSummaryJson,
  workspaceId?: string,
  audit: TransactionCreateAuditOptions = {}
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
  const existing = await loadMonthlyClosingById(config, id, workspaceId);
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
    action: "month_closed",
    actor: audit.actor ?? "admin",
    ...auditContext(audit, workspaceId),
    created_at: now,
    details: {
      month,
      readiness_score: readinessScore,
      result: "success",
      status: "closed",
      year
    },
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
  const saved = await upsertMonthlyClosing(config, closing, workspaceId);
  await insertRequiredAuditLogs(config, [auditLog], workspaceId);

  return { audit_logs: [auditLog], closing: saved };
}

export async function reopenSupabaseMonthlyClosing(
  year: number,
  month: number,
  reason: string,
  workspaceId?: string,
  audit: TransactionCreateAuditOptions = {}
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
  const existing = await loadMonthlyClosingById(config, id, workspaceId);
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
    action: "month_reopened",
    actor: audit.actor ?? "admin",
    ...auditContext(audit, workspaceId),
    created_at: now,
    details: {
      month,
      result: "success",
      status: "reopened",
      year
    },
    entity_id: id,
    entity_type: "reconciliation",
    field_name: "monthly_closing",
    old_value: existing?.status ?? "closed",
    new_value: "reopened",
    reason: trimmedReason,
    source: "manual"
  });
  const saved = await upsertMonthlyClosing(config, closing, workspaceId);
  await insertRequiredAuditLogs(config, [auditLog], workspaceId);

  return { audit_logs: [auditLog], closing: saved };
}

export async function updateSupabaseMonthlyClosingSummary(
  year: number,
  month: number,
  summary: MonthlyClosingSummaryJson,
  workspaceId?: string
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const id = monthlyClosingId(year, month);
  const existing = await loadMonthlyClosingById(config, id, workspaceId);

  if (!existing) {
    throw new Error("Monthly closing record was not found.");
  }

  const saved = await upsertMonthlyClosing(config, {
    ...existing,
    summary_json: summary,
    updated_at: new Date().toISOString()
  }, workspaceId);

  return { audit_logs: [], closing: saved };
}

export async function appendSupabaseAuditLogs(entries: AuditLog[], workspaceId?: string) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalizedEntries = normalizeAuditLogs(entries);

  await insertIgnoreRows(config, "audit_logs", normalizedEntries.map((entry) => withWorkspace(entry, workspaceId)), "id");

  return loadSupabaseAuditLogs(workspaceId);
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
