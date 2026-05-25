"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  buildSettingsAuditLogs,
  buildTransactionAuditLogs,
  createAuditEntry,
  mergeAuditLogs,
  normalizeAuditLogs,
  transactionSummary,
  type SettingsAuditOptions,
  type TransactionAuditOptions
} from "@/lib/audit";
import {
  buildClosingSummary,
  monthlyClosingId,
  monthlyClosingsStorageKey,
  monthPeriod,
  normalizeMonthlyClosings,
  requiresClosedPeriodReason
} from "@/lib/monthly-closing";
import {
  getReceiptRequiredDefault,
  normalizeCategoryReceiptDefault
} from "@/lib/receipt-requirements";
import { categories, defaultSettings, seedTransactions } from "@/lib/seed-data";
import type {
  AppSettings,
  AuditActor,
  AuditLog,
  AuditSource,
  Category,
  LocalBackup,
  MonthlyClosing,
  MonthlyClosingSummaryJson,
  StorageStatus,
  Transaction,
  TransactionDraft
} from "@/lib/types";

type CreateTransactionAuditOptions = {
  actor?: AuditActor;
  reason?: string;
  source?: AuditSource;
};

type BulkTransactionUpdate = {
  audit?: TransactionAuditOptions;
  id: string;
  transaction: Partial<TransactionDraft>;
};

type BookkeepingContextValue = {
  transactions: Transaction[];
  monthlyClosings: MonthlyClosing[];
  settings: AppSettings;
  categories: Category[];
  auditLogs: AuditLog[];
  storageStatus: StorageStatus;
  addTransaction: (transaction: TransactionDraft, audit?: CreateTransactionAuditOptions) => Transaction;
  bulkUpdateTransactions: (updates: BulkTransactionUpdate[]) => void;
  importTransactions: (
    transactions: TransactionDraft[],
    audit?: CreateTransactionAuditOptions
  ) => Transaction[];
  updateTransaction: (
    id: string,
    transaction: Partial<TransactionDraft>,
    audit?: TransactionAuditOptions
  ) => void;
  deleteTransaction: (id: string, audit?: CreateTransactionAuditOptions) => void;
  updateSettings: (settings: AppSettings, audit?: SettingsAuditOptions) => void;
  clearTransactions: () => void;
  resetDemoData: () => void;
  exportBackup: () => LocalBackup;
  importBackup: (backup: LocalBackup) => void;
  syncToSupabase: () => Promise<boolean>;
  loadFromSupabase: () => Promise<boolean>;
  migrateLocalDataToSupabase: () => Promise<boolean>;
  loadMonthlyClosings: () => Promise<boolean>;
  closeMonth: (
    year: number,
    month: number,
    reason: string,
    checklist: Record<string, boolean>
  ) => Promise<boolean>;
  reopenMonth: (year: number, month: number, reason: string) => Promise<boolean>;
  updateClosingSummary: (
    year: number,
    month: number,
    summary: MonthlyClosingSummaryJson
  ) => Promise<boolean>;
};

type StorageApiResponse = {
  apiStatus?: number;
  apiStatusText?: string;
  configured: boolean;
  data?: LocalBackup;
  error?: string;
  message?: string;
  mode: StorageStatus["mode"];
};

type AuditApiResponse = {
  apiStatus?: number;
  apiStatusText?: string;
  configured: boolean;
  data?: AuditLog[];
  error?: string;
  message?: string;
  mode: StorageStatus["mode"];
};

type LedgerTransactionApiResponse = {
  apiStatus?: number;
  apiStatusText?: string;
  audit_logs?: AuditLog[];
  configured: boolean;
  error?: string;
  id?: string;
  message?: string;
  mode: StorageStatus["mode"];
  transaction?: Transaction;
  transactions?: Transaction[];
};

type MonthlyClosingApiResponse = {
  apiStatus?: number;
  apiStatusText?: string;
  audit_logs?: AuditLog[];
  closing?: MonthlyClosing;
  closings?: MonthlyClosing[];
  configured: boolean;
  error?: string;
  message?: string;
  mode: StorageStatus["mode"];
};

const TRANSACTIONS_KEY = "mercury-bookkeeping-transactions";
const SETTINGS_KEY = "mercury-bookkeeping-settings";
const CATEGORIES_KEY = "mercury-bookkeeping-categories";
const AUDIT_LOGS_KEY = "mercury-bookkeeping-audit-logs";
const MONTHLY_CLOSINGS_KEY = monthlyClosingsStorageKey;

const localStorageStatus: StorageStatus = {
  apiStatus: 200,
  apiStatusText: "OK",
  configured: false,
  mode: "local",
  message: "Supabase is not configured. Using browser localStorage."
};

const checkingStorageStatus: StorageStatus = {
  configured: false,
  mode: "checking",
  message: "Checking storage configuration."
};

const fullSupabaseSyncBlockedMessage =
  "Full Supabase backup writes are disabled in Supabase mode. Use server ledger APIs for transaction writes.";

const BookkeepingContext = createContext<BookkeepingContextValue | null>(null);

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `txn-${Date.now()}`;
}

function sortTransactions(items: Transaction[]) {
  return [...items].sort((left, right) => right.date.localeCompare(left.date));
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
    id: String(transaction.id ?? createId()),
    date: String(transaction.date ?? ""),
    account: String(transaction.account ?? defaultSettings.default_account),
    source: String(transaction.source ?? "Manual"),
    vendor: String(transaction.vendor ?? ""),
    description: String(transaction.description ?? ""),
    currency: String(transaction.currency ?? defaultSettings.default_currency),
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
  const normalized = {
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
    type: category.type ?? "Expense",
    tax_line: String(category.tax_line ?? "Needs review"),
    receipt_required_default: Boolean(category.receipt_required_default ?? true),
    description: String(category.description ?? "")
  };

  return normalizeCategoryReceiptDefault(normalized);
}

function normalizeCategories(nextCategories: unknown): Category[] {
  const normalized = Array.isArray(nextCategories)
    ? nextCategories.map((category) => normalizeCategory(category as Partial<Category>))
    : [];
  const categoryByName = new Map(normalized.map((category) => [category.name, category]));
  const seedCategoryNames = new Set(categories.map((category) => category.name));
  const mergedKnownCategories = categories.map((category) =>
    normalizeCategoryReceiptDefault(categoryByName.get(category.name) ?? category)
  );
  const customCategories = normalized.filter((category) => !seedCategoryNames.has(category.name));

  return [...mergedKnownCategories, ...customCategories];
}

function normalizeBackup(backup: Partial<LocalBackup>): LocalBackup {
  const transactions = Array.isArray(backup.transactions)
    ? backup.transactions.map((transaction) => normalizeTransaction(transaction))
    : [];

  return {
    exported_at: backup.exported_at || new Date().toISOString(),
    version: backup.version === 1 || backup.version === 2 ? backup.version : 3,
    transactions,
    categories: normalizeCategories(backup.categories),
    receipts: Array.isArray(backup.receipts)
      ? backup.receipts
      : transactions.map((transaction) => ({
          transaction_id: transaction.id,
          receipt_required: transaction.receipt_required,
          receipt_link: transaction.receipt_link,
          reconciled: transaction.reconciled
        })),
    audit_logs: normalizeAuditLogs(backup.audit_logs),
    monthly_closings: normalizeMonthlyClosings(backup.monthly_closings),
    settings: normalizeSettings(backup.settings)
  };
}

function createBackup(
  transactions: Transaction[],
  categoryState: Category[],
  settings: AppSettings,
  auditLogs: AuditLog[],
  monthlyClosings: MonthlyClosing[] = []
): LocalBackup {
  return {
    exported_at: new Date().toISOString(),
    version: 3,
    transactions,
    categories: categoryState,
    receipts: transactions.map((transaction) => ({
      transaction_id: transaction.id,
      receipt_required: transaction.receipt_required,
      receipt_link: transaction.receipt_link,
      reconciled: transaction.reconciled
    })),
    audit_logs: auditLogs,
    monthly_closings: monthlyClosings,
    settings
  };
}

export function BookkeepingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categoryState, setCategoryState] = useState<Category[]>(categories);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(checkingStorageStatus);
  const [loaded, setLoaded] = useState(false);

  const applyBackup = useCallback((backup: Partial<LocalBackup>) => {
    const normalized = normalizeBackup(backup);

    setTransactions(sortTransactions(normalized.transactions));
    setCategoryState(normalized.categories);
    setSettings(normalized.settings);
    setAuditLogs(normalized.audit_logs);
    setMonthlyClosings(normalizeMonthlyClosings(normalized.monthly_closings));

    return normalized;
  }, []);

  const requestStorage = useCallback(
    async (method: "GET" | "PUT", backup?: LocalBackup): Promise<StorageApiResponse> => {
      const response = await fetch("/api/storage", {
        method,
        headers: backup ? { "Content-Type": "application/json" } : undefined,
        body: backup ? JSON.stringify(backup) : undefined
      });
      const responseText = await response.text();
      let result: StorageApiResponse | null = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as StorageApiResponse;
        } catch {
          throw new Error(
            `Storage API returned invalid JSON. HTTP ${response.status} ${response.statusText}. ${responseText.slice(0, 240)}`
          );
        }
      }

      if (!result && !response.ok) {
        throw new Error(`Storage API request failed. HTTP ${response.status} ${response.statusText}.`);
      }

      if (!result) {
        return {
          apiStatus: response.status,
          apiStatusText: response.statusText,
          configured: false,
          message: "Storage API returned an empty successful response; using localStorage fallback.",
          mode: "local"
        };
      }

      if (!response.ok) {
        const detail = result.error || result.message || "Storage request failed.";

        throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
      }

      return {
        ...result,
        apiStatus: result.apiStatus ?? response.status,
        apiStatusText: result.apiStatusText ?? response.statusText
      };
    },
    []
  );

  const requestAudit = useCallback(
    async (method: "GET" | "POST", entries?: AuditLog[]): Promise<AuditApiResponse> => {
      const response = await fetch("/api/audit", {
        method,
        headers: entries ? { "Content-Type": "application/json" } : undefined,
        body: entries ? JSON.stringify({ entries }) : undefined
      });
      const responseText = await response.text();
      let result: AuditApiResponse | null = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as AuditApiResponse;
        } catch {
          throw new Error(
            `Audit API returned invalid JSON. HTTP ${response.status} ${response.statusText}. ${responseText.slice(0, 240)}`
          );
        }
      }

      if (!result && !response.ok) {
        throw new Error(`Audit API request failed. HTTP ${response.status} ${response.statusText}.`);
      }

      if (!result) {
        return {
          apiStatus: response.status,
          apiStatusText: response.statusText,
          configured: false,
          message: "Audit API returned an empty successful response; using localStorage fallback.",
          mode: "local"
        };
      }

      if (!response.ok) {
        const detail = result.error || result.message || "Audit request failed.";

        throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
      }

      return {
        ...result,
        apiStatus: result.apiStatus ?? response.status,
        apiStatusText: result.apiStatusText ?? response.statusText
      };
    },
    []
  );

  const requestLedgerTransaction = useCallback(
    async (payload: Record<string, unknown>): Promise<LedgerTransactionApiResponse> => {
      const response = await fetch("/api/ledger/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      let result: LedgerTransactionApiResponse | null = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as LedgerTransactionApiResponse;
        } catch {
          throw new Error(
            `Transaction API returned invalid JSON. HTTP ${response.status} ${response.statusText}. ${responseText.slice(0, 240)}`
          );
        }
      }

      if (!result && !response.ok) {
        throw new Error(`Transaction API request failed. HTTP ${response.status} ${response.statusText}.`);
      }

      if (!result) {
        return {
          apiStatus: response.status,
          apiStatusText: response.statusText,
          configured: false,
          message: "Transaction API returned an empty successful response; using localStorage fallback.",
          mode: "local"
        };
      }

      if (!response.ok) {
        const detail = result.error || result.message || "Transaction request failed.";

        throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
      }

      return {
        ...result,
        apiStatus: result.apiStatus ?? response.status,
        apiStatusText: result.apiStatusText ?? response.statusText
      };
    },
    []
  );

  const requestMonthlyClosing = useCallback(
    async (payload?: Record<string, unknown>): Promise<MonthlyClosingApiResponse> => {
      const response = await fetch("/api/monthly-closings", {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined
      });
      const responseText = await response.text();
      let result: MonthlyClosingApiResponse | null = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as MonthlyClosingApiResponse;
        } catch {
          throw new Error(
            `Monthly closing API returned invalid JSON. HTTP ${response.status} ${response.statusText}. ${responseText.slice(0, 240)}`
          );
        }
      }

      if (!result && !response.ok) {
        throw new Error(`Monthly closing API request failed. HTTP ${response.status} ${response.statusText}.`);
      }

      if (!result) {
        return {
          apiStatus: response.status,
          apiStatusText: response.statusText,
          configured: false,
          message: "Monthly closing API returned an empty successful response; using localStorage fallback.",
          mode: "local"
        };
      }

      if (!response.ok) {
        const detail = result.error || result.message || "Monthly closing request failed.";

        throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
      }

      return {
        ...result,
        apiStatus: result.apiStatus ?? response.status,
        apiStatusText: result.apiStatusText ?? response.statusText
      };
    },
    []
  );

  const applyLedgerTransactionResult = useCallback((result: LedgerTransactionApiResponse) => {
    if (!result.configured) {
      setStorageStatus({
        ...localStorageStatus,
        apiStatus: result.apiStatus,
        apiStatusText: result.apiStatusText,
        message: result.message || localStorageStatus.message
      });
      return false;
    }

    if (result.transaction) {
      setTransactions((current) => {
        const exists = current.some((transaction) => transaction.id === result.transaction?.id);
        const nextTransactions = exists
          ? current.map((transaction) =>
              transaction.id === result.transaction?.id ? result.transaction : transaction
            )
          : [result.transaction, ...current];

        return sortTransactions(nextTransactions.filter(Boolean) as Transaction[]);
      });
    }

    if (result.transactions) {
      setTransactions((current) => {
        const transactionById = new Map(current.map((transaction) => [transaction.id, transaction]));

        for (const transaction of result.transactions ?? []) {
          transactionById.set(transaction.id, transaction);
        }

        return sortTransactions(Array.from(transactionById.values()));
      });
    }

    if (result.id && !result.transaction) {
      setTransactions((current) => current.filter((transaction) => transaction.id !== result.id));
    }

    if (result.audit_logs?.length) {
      setAuditLogs((current) => mergeAuditLogs(current, result.audit_logs));
    }

    setStorageStatus({
      apiStatus: result.apiStatus,
      apiStatusText: result.apiStatusText,
      configured: true,
      mode: "supabase",
      message: result.message || "Supabase transaction synced."
    });
    return true;
  }, []);

  const applyMonthlyClosingResult = useCallback((result: MonthlyClosingApiResponse) => {
    if (!result.configured) {
      setStorageStatus({
        ...localStorageStatus,
        apiStatus: result.apiStatus,
        apiStatusText: result.apiStatusText,
        message: result.message || localStorageStatus.message
      });
      return false;
    }

    if (result.closings) {
      setMonthlyClosings(normalizeMonthlyClosings(result.closings));
    }

    if (result.closing) {
      setMonthlyClosings((current) => {
        const next = new Map(current.map((closing) => [closing.id, closing]));
        next.set(result.closing!.id, result.closing!);
        return normalizeMonthlyClosings(Array.from(next.values()));
      });
    }

    if (result.audit_logs?.length) {
      setAuditLogs((current) => mergeAuditLogs(current, result.audit_logs));
    }

    setStorageStatus({
      apiStatus: result.apiStatus,
      apiStatusText: result.apiStatusText,
      configured: true,
      mode: "supabase",
      message: result.message || "Supabase monthly closing synced."
    });
    return true;
  }, []);

  const persistLedgerTransaction = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const result = await requestLedgerTransaction(payload);

        return applyLedgerTransactionResult(result);
      } catch (error) {
        setStorageStatus({
          apiStatus: 0,
          apiStatusText: "Client error",
          configured: true,
          error: error instanceof Error ? error.message : "Supabase transaction sync failed.",
          mode: "error",
          message: error instanceof Error ? error.message : "Supabase transaction sync failed."
        });
        return false;
      }
    },
    [applyLedgerTransactionResult, requestLedgerTransaction]
  );

  const loadAuditTrail = useCallback(async () => {
    try {
      const result = await requestAudit("GET");

      if (!result.configured) return false;

      if (result.data) {
        setAuditLogs(normalizeAuditLogs(result.data));
      }

      return true;
    } catch {
      return false;
    }
  }, [requestAudit]);

  const loadMonthlyClosings = useCallback(async () => {
    try {
      const result = await requestMonthlyClosing();

      if (!result.configured) return false;

      return applyMonthlyClosingResult(result);
    } catch {
      return false;
    }
  }, [applyMonthlyClosingResult, requestMonthlyClosing]);

  const loadFromSupabase = useCallback(async () => {
    try {
      const result = await requestStorage("GET");

      if (!result.configured) {
        setStorageStatus({
          ...localStorageStatus,
          apiStatus: result.apiStatus,
          apiStatusText: result.apiStatusText,
          message: result.message || localStorageStatus.message
        });
        return false;
      }

      if (result.data) {
        applyBackup(result.data);
      }

      setStorageStatus({
        apiStatus: result.apiStatus,
        apiStatusText: result.apiStatusText,
        configured: true,
        mode: "supabase",
        message: result.message || "Supabase connected."
      });
      void loadAuditTrail();
      void loadMonthlyClosings();
      return true;
    } catch (error) {
      setStorageStatus({
        apiStatus: 0,
        apiStatusText: "Client error",
        configured: true,
        error: error instanceof Error ? error.message : "Supabase request failed.",
        mode: "error",
        message: error instanceof Error ? error.message : "Supabase request failed."
      });
      return false;
    }
  }, [applyBackup, loadAuditTrail, loadMonthlyClosings, requestStorage]);

  const sendBackupToSupabase = useCallback(
    async (backup: LocalBackup) => {
      try {
        const result = await requestStorage("PUT", backup);

        if (!result.configured) {
          setStorageStatus({
            ...localStorageStatus,
            apiStatus: result.apiStatus,
            apiStatusText: result.apiStatusText,
            message: result.message || localStorageStatus.message
          });
          return false;
        }

        if (result.data) {
          applyBackup(result.data);
        }

        setStorageStatus({
          apiStatus: result.apiStatus,
          apiStatusText: result.apiStatusText,
          configured: true,
          mode: "supabase",
          message: result.message || "Supabase synced."
        });
        return true;
      } catch (error) {
        setStorageStatus({
          apiStatus: 0,
          apiStatusText: "Client error",
          configured: true,
          error: error instanceof Error ? error.message : "Supabase sync failed.",
          mode: "error",
          message: error instanceof Error ? error.message : "Supabase sync failed."
        });
        return false;
      }
    },
    [applyBackup, requestStorage]
  );

  const sendAuditEntriesToSupabase = useCallback(
    async (entries: AuditLog[]) => {
      if (!entries.length) return true;

      try {
        const result = await requestAudit("POST", entries);

        if (!result.configured) {
          setStorageStatus({
            ...localStorageStatus,
            apiStatus: result.apiStatus,
            apiStatusText: result.apiStatusText,
            message: result.message || localStorageStatus.message
          });
          return false;
        }

        if (result.data) {
          setAuditLogs(normalizeAuditLogs(result.data));
        }

        return true;
      } catch (error) {
        setStorageStatus({
          apiStatus: 0,
          apiStatusText: "Client error",
          configured: true,
          error: error instanceof Error ? error.message : "Supabase audit sync failed.",
          mode: "error",
          message: error instanceof Error ? error.message : "Supabase audit sync failed."
        });
        return false;
      }
    },
    [requestAudit]
  );

  const blockFullSupabaseSync = useCallback(() => {
    setStorageStatus({
      apiStatus: 409,
      apiStatusText: "Conflict",
      configured: true,
      error: fullSupabaseSyncBlockedMessage,
      mode: "error",
      message: fullSupabaseSyncBlockedMessage
    });
    return false;
  }, []);

  const maybeSyncToSupabase = useCallback(
    (_backup: LocalBackup, _newAuditEntries: AuditLog[] = []) => {
      void _backup;
      void _newAuditEntries;

      if (storageStatus.configured && storageStatus.mode !== "local") {
        blockFullSupabaseSync();
      }
    },
    [
      blockFullSupabaseSync,
      storageStatus.configured,
      storageStatus.mode
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localBackup = normalizeBackup({
        transactions: loadJson(TRANSACTIONS_KEY, seedTransactions),
        settings: loadJson(SETTINGS_KEY, defaultSettings),
        categories: loadJson(CATEGORIES_KEY, categories),
        audit_logs: loadJson(AUDIT_LOGS_KEY, []),
        monthly_closings: loadJson(MONTHLY_CLOSINGS_KEY, [])
      });

      applyBackup(localBackup);
      setLoaded(true);
      void loadFromSupabase();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [applyBackup, loadFromSupabase]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }, [loaded, transactions]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [loaded, settings]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categoryState));
    }
  }, [categoryState, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(auditLogs));
    }
  }, [auditLogs, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(MONTHLY_CLOSINGS_KEY, JSON.stringify(monthlyClosings));
    }
  }, [loaded, monthlyClosings]);

  const syncToSupabase = useCallback(async () => {
    if (storageStatus.configured && storageStatus.mode !== "local") {
      return blockFullSupabaseSync();
    }

    const backup = createBackup(transactions, categoryState, settings, auditLogs, monthlyClosings);
    const [backupOk, auditOk] = await Promise.all([
      sendBackupToSupabase(backup),
      sendAuditEntriesToSupabase(auditLogs)
    ]);

    return backupOk && auditOk;
  }, [
    auditLogs,
    blockFullSupabaseSync,
    categoryState,
    monthlyClosings,
    sendAuditEntriesToSupabase,
    sendBackupToSupabase,
    settings,
    storageStatus.configured,
    storageStatus.mode,
    transactions
  ]);

  const migrateLocalDataToSupabase = useCallback(async () => {
    if (storageStatus.configured && storageStatus.mode !== "local") {
      return blockFullSupabaseSync();
    }

    const localBackup = normalizeBackup({
      transactions: loadJson(TRANSACTIONS_KEY, transactions),
      settings: loadJson(SETTINGS_KEY, settings),
      categories: loadJson(CATEGORIES_KEY, categoryState),
      audit_logs: loadJson(AUDIT_LOGS_KEY, auditLogs),
      monthly_closings: loadJson(MONTHLY_CLOSINGS_KEY, monthlyClosings)
    });
    const [backupOk, auditOk] = await Promise.all([
      sendBackupToSupabase(localBackup),
      sendAuditEntriesToSupabase(localBackup.audit_logs)
    ]);

    return backupOk && auditOk;
  }, [
    auditLogs,
    blockFullSupabaseSync,
    categoryState,
    sendAuditEntriesToSupabase,
    sendBackupToSupabase,
    settings,
    storageStatus.configured,
    storageStatus.mode,
    transactions,
    monthlyClosings
  ]);

  const closeMonth = useCallback(
    async (
      year: number,
      month: number,
      reason: string,
      checklist: Record<string, boolean>
    ) => {
      const trimmedReason = reason.trim();

      if (!trimmedReason) return false;

      const summary = buildClosingSummary(
        transactions,
        categoryState,
        auditLogs,
        year,
        month,
        checklist
      );

      if (storageStatus.configured && storageStatus.mode === "supabase") {
        try {
          const result = await requestMonthlyClosing({
            action: "close",
            checklist,
            month,
            reason: trimmedReason,
            summary,
            year
          });

          return applyMonthlyClosingResult(result);
        } catch (error) {
          setStorageStatus({
            apiStatus: 0,
            apiStatusText: "Client error",
            configured: true,
            error: error instanceof Error ? error.message : "Monthly closing sync failed.",
            mode: "error",
            message: error instanceof Error ? error.message : "Monthly closing sync failed."
          });
          return false;
        }
      }

      const now = new Date().toISOString();
      const { periodEnd, periodStart } = monthPeriod(year, month);
      const existing = monthlyClosings.find((closing) => closing.year === year && closing.month === month);
      const closing: MonthlyClosing = {
        ...(existing ?? {
          id: monthlyClosingId(year, month),
          created_at: now,
          reopened_at: null,
          reopened_by: null,
          reopen_reason: ""
        }),
        year,
        month,
        period_start: periodStart,
        period_end: periodEnd,
        status: "closed",
        readiness_score: summary.missing_receipts_count ||
          summary.needs_review_count ||
          summary.uncategorized_count ||
          summary.unreconciled_count ||
          summary.possible_duplicates_count
          ? Math.max(0, 100 - (
              summary.missing_receipts_count * 8 +
              summary.needs_review_count * 6 +
              summary.uncategorized_count * 8 +
              summary.unreconciled_count * 3 +
              summary.possible_duplicates_count * 6
            ))
          : 100,
        closed_at: now,
        closed_by: "admin",
        close_reason: trimmedReason,
        summary_json: summary,
        updated_at: now
      };
      const auditEntry = createAuditEntry({
        action: "update",
        actor: "admin",
        created_at: now,
        entity_id: closing.id,
        entity_type: "reconciliation",
        field_name: "monthly_closing",
        new_value: JSON.stringify({
          month,
          readiness_score: closing.readiness_score,
          status: "closed",
          year
        }),
        old_value: existing?.status ?? "open",
        reason: trimmedReason,
        source: "manual"
      });

      setMonthlyClosings((current) => {
        const next = new Map(current.map((item) => [item.id, item]));
        next.set(closing.id, closing);
        return normalizeMonthlyClosings(Array.from(next.values()));
      });
      setAuditLogs((current) => mergeAuditLogs(current, [auditEntry]));
      return true;
    },
    [
      applyMonthlyClosingResult,
      auditLogs,
      categoryState,
      monthlyClosings,
      requestMonthlyClosing,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const reopenMonth = useCallback(
    async (year: number, month: number, reason: string) => {
      const trimmedReason = reason.trim();

      if (!trimmedReason) return false;

      if (storageStatus.configured && storageStatus.mode === "supabase") {
        try {
          const result = await requestMonthlyClosing({
            action: "reopen",
            month,
            reason: trimmedReason,
            year
          });

          return applyMonthlyClosingResult(result);
        } catch (error) {
          setStorageStatus({
            apiStatus: 0,
            apiStatusText: "Client error",
            configured: true,
            error: error instanceof Error ? error.message : "Monthly reopen sync failed.",
            mode: "error",
            message: error instanceof Error ? error.message : "Monthly reopen sync failed."
          });
          return false;
        }
      }

      const now = new Date().toISOString();
      const { periodEnd, periodStart } = monthPeriod(year, month);
      const existing = monthlyClosings.find((closing) => closing.year === year && closing.month === month);
      const closing: MonthlyClosing = {
        ...(existing ?? {
          id: monthlyClosingId(year, month),
          closed_at: null,
          closed_by: null,
          close_reason: "",
          created_at: now,
          readiness_score: 0,
          summary_json: buildClosingSummary(transactions, categoryState, auditLogs, year, month)
        }),
        year,
        month,
        period_start: periodStart,
        period_end: periodEnd,
        status: "reopened",
        reopened_at: now,
        reopened_by: "admin",
        reopen_reason: trimmedReason,
        updated_at: now
      };
      const auditEntry = createAuditEntry({
        action: "update",
        actor: "admin",
        created_at: now,
        entity_id: closing.id,
        entity_type: "reconciliation",
        field_name: "monthly_closing",
        new_value: "reopened",
        old_value: existing?.status ?? "closed",
        reason: trimmedReason,
        source: "manual"
      });

      setMonthlyClosings((current) => {
        const next = new Map(current.map((item) => [item.id, item]));
        next.set(closing.id, closing);
        return normalizeMonthlyClosings(Array.from(next.values()));
      });
      setAuditLogs((current) => mergeAuditLogs(current, [auditEntry]));
      return true;
    },
    [
      applyMonthlyClosingResult,
      auditLogs,
      categoryState,
      monthlyClosings,
      requestMonthlyClosing,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const updateClosingSummary = useCallback(
    async (year: number, month: number, summary: MonthlyClosingSummaryJson) => {
      if (storageStatus.configured && storageStatus.mode === "supabase") {
        try {
          const result = await requestMonthlyClosing({
            action: "update_summary",
            month,
            summary,
            year
          });

          return applyMonthlyClosingResult(result);
        } catch {
          return false;
        }
      }

      setMonthlyClosings((current) =>
        normalizeMonthlyClosings(
          current.map((closing) =>
            closing.year === year && closing.month === month
              ? { ...closing, summary_json: summary, updated_at: new Date().toISOString() }
              : closing
          )
        )
      );
      return true;
    },
    [
      applyMonthlyClosingResult,
      requestMonthlyClosing,
      storageStatus.configured,
      storageStatus.mode
    ]
  );

  const addTransaction = useCallback(
    (draft: TransactionDraft, audit: CreateTransactionAuditOptions = {}) => {
      const now = new Date().toISOString();
      const supabaseMode = storageStatus.configured && storageStatus.mode === "supabase";
      const transaction: Transaction = {
        ...draft,
        id: createId(),
        created_at: now,
        updated_at: now
      };
      const nextTransactions = sortTransactions([transaction, ...transactions]);

      if (supabaseMode) {
        setTransactions(nextTransactions);
        void persistLedgerTransaction({
          action: "create",
          audit,
          transaction
        });

        return transaction;
      }

      const newAuditEntries = [
        createAuditEntry({
          action: "create",
          actor: audit.actor ?? "admin",
          created_at: now,
          entity_id: transaction.id,
          entity_type: "transaction",
          field_name: "",
          new_value: transactionSummary(transaction),
          old_value: "",
          reason: audit.reason || "",
          source: audit.source ?? "manual"
        })
      ];
      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setTransactions(nextTransactions);
      setAuditLogs(nextAuditLogs);
      maybeSyncToSupabase(
        createBackup(nextTransactions, categoryState, settings, nextAuditLogs),
        newAuditEntries
      );

      return transaction;
    },
    [
      auditLogs,
      categoryState,
      maybeSyncToSupabase,
      persistLedgerTransaction,
      settings,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const importTransactions = useCallback(
    (drafts: TransactionDraft[], audit: CreateTransactionAuditOptions = {}) => {
      const now = new Date().toISOString();
      const supabaseMode = storageStatus.configured && storageStatus.mode === "supabase";
      const importedTransactions = drafts.map((draft) => ({
        ...draft,
        id: createId(),
        created_at: now,
        updated_at: now
      }));
      const nextTransactions = sortTransactions([...importedTransactions, ...transactions]);

      if (supabaseMode) {
        setTransactions(nextTransactions);
        void persistLedgerTransaction({
          action: "import",
          audit,
          transactions: importedTransactions
        });

        return importedTransactions;
      }

      const newAuditEntries = importedTransactions.map((transaction) =>
        createAuditEntry({
          action: "create",
          actor: audit.actor ?? "system",
          created_at: now,
          entity_id: transaction.id,
          entity_type: "transaction",
          field_name: "",
          new_value: transactionSummary(transaction),
          old_value: "",
          reason: audit.reason || transaction.notes || "Imported transaction.",
          source: audit.source ?? "csv_import"
        })
      );
      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setTransactions(nextTransactions);
      setAuditLogs(nextAuditLogs);
      maybeSyncToSupabase(
        createBackup(nextTransactions, categoryState, settings, nextAuditLogs),
        newAuditEntries
      );

      return importedTransactions;
    },
    [
      auditLogs,
      categoryState,
      maybeSyncToSupabase,
      persistLedgerTransaction,
      settings,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const updateTransaction = useCallback(
    (id: string, draft: Partial<TransactionDraft>, audit: TransactionAuditOptions = {}) => {
      const currentTransaction = transactions.find((transaction) => transaction.id === id);

      if (!currentTransaction) return;

      const timestamp = new Date().toISOString();
      const nextTransaction = {
        ...currentTransaction,
        ...draft,
        updated_at: timestamp
      };
      const closedPeriodReasonRequired = requiresClosedPeriodReason(
        monthlyClosings,
        currentTransaction,
        draft
      );

      if (closedPeriodReasonRequired && !audit.reason?.trim()) {
        setStorageStatus({
          apiStatus: 400,
          apiStatusText: "Bad Request",
          configured: storageStatus.configured,
          error: "Closed-period changes require an audit reason.",
          mode: "error",
          message: "Closed-period changes require an audit reason."
        });
        return;
      }

      const newAuditEntries = buildTransactionAuditLogs(currentTransaction, nextTransaction, {
        ...audit,
        createdAt: timestamp
      });

      if (!newAuditEntries.length) return;

      const nextTransactions = sortTransactions(
        transactions.map((transaction) => (transaction.id === id ? nextTransaction : transaction))
      );

      if (storageStatus.configured && storageStatus.mode === "supabase") {
        setTransactions(nextTransactions);
        void persistLedgerTransaction({
          action: "update",
          audit,
          id,
          transaction: draft
        });
        return;
      }

      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setTransactions(nextTransactions);
      setAuditLogs(nextAuditLogs);
      maybeSyncToSupabase(
        createBackup(nextTransactions, categoryState, settings, nextAuditLogs),
        newAuditEntries
      );
    },
    [
      auditLogs,
      categoryState,
      monthlyClosings,
      maybeSyncToSupabase,
      persistLedgerTransaction,
      settings,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const bulkUpdateTransactions = useCallback(
    (updates: BulkTransactionUpdate[]) => {
      if (updates.length === 0) return;

      const patchById = new Map(updates.map((update) => [update.id, update]));
      const timestamp = new Date().toISOString();
      const newAuditEntries: AuditLog[] = [];
      const nextTransactions = sortTransactions(
        transactions.map((transaction) => {
          const update = patchById.get(transaction.id);

          if (!update) return transaction;

          const nextTransaction = {
            ...transaction,
            ...update.transaction,
            updated_at: timestamp
          };

          newAuditEntries.push(
            ...buildTransactionAuditLogs(transaction, nextTransaction, {
              ...update.audit,
              createdAt: timestamp
            })
          );

          return nextTransaction;
        })
      );

      if (!newAuditEntries.length) return;

      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setTransactions(nextTransactions);
      setAuditLogs(nextAuditLogs);
      maybeSyncToSupabase(
        createBackup(nextTransactions, categoryState, settings, nextAuditLogs),
        newAuditEntries
      );
    },
    [auditLogs, categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const deleteTransaction = useCallback(
    (id: string, audit: CreateTransactionAuditOptions = {}) => {
      const currentTransaction = transactions.find((transaction) => transaction.id === id);

      if (!currentTransaction) return;

      const timestamp = new Date().toISOString();
      const nextTransactions = transactions.filter((transaction) => transaction.id !== id);
      const closedPeriodReasonRequired = requiresClosedPeriodReason(
        monthlyClosings,
        currentTransaction,
        {
          date: currentTransaction.date,
          money_in: currentTransaction.money_in,
          money_out: currentTransaction.money_out
        }
      );

      if (closedPeriodReasonRequired && !audit.reason?.trim()) {
        setStorageStatus({
          apiStatus: 400,
          apiStatusText: "Bad Request",
          configured: storageStatus.configured,
          error: "Closed-period deletes require an audit reason.",
          mode: "error",
          message: "Closed-period deletes require an audit reason."
        });
        return;
      }

      if (storageStatus.configured && storageStatus.mode === "supabase") {
        setTransactions(nextTransactions);
        void persistLedgerTransaction({
          action: "delete",
          audit,
          id
        });
        return;
      }

      const newAuditEntries = [
        createAuditEntry({
          action: "delete",
          actor: audit.actor ?? "admin",
          created_at: timestamp,
          entity_id: currentTransaction.id,
          entity_type: "transaction",
          field_name: "",
          new_value: "",
          old_value: transactionSummary(currentTransaction),
          reason: audit.reason || "",
          source: audit.source ?? "manual"
        })
      ];
      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setTransactions(nextTransactions);
      setAuditLogs(nextAuditLogs);
      maybeSyncToSupabase(
        createBackup(nextTransactions, categoryState, settings, nextAuditLogs),
        newAuditEntries
      );
    },
    [
      auditLogs,
      categoryState,
      monthlyClosings,
      maybeSyncToSupabase,
      persistLedgerTransaction,
      settings,
      storageStatus.configured,
      storageStatus.mode,
      transactions
    ]
  );

  const updateSettings = useCallback(
    (nextSettings: AppSettings, audit: SettingsAuditOptions = {}) => {
      const normalized = normalizeSettings(nextSettings);
      const newAuditEntries = buildSettingsAuditLogs(settings, normalized, audit);
      const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

      setSettings(normalized);
      if (newAuditEntries.length) {
        setAuditLogs(nextAuditLogs);
      }
      maybeSyncToSupabase(
        createBackup(transactions, categoryState, normalized, nextAuditLogs),
        newAuditEntries
      );
    },
    [auditLogs, categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const clearTransactions = useCallback(() => {
    const timestamp = new Date().toISOString();
    const newAuditEntries = transactions.map((transaction) =>
      createAuditEntry({
        action: "delete",
        actor: "admin",
        created_at: timestamp,
        entity_id: transaction.id,
        entity_type: "transaction",
        field_name: "",
        new_value: "",
        old_value: transactionSummary(transaction),
        reason: "Cleared from data management.",
        source: "manual"
      })
    );
    const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

    setTransactions([]);
    setAuditLogs(nextAuditLogs);
    maybeSyncToSupabase(
      createBackup([], categoryState, settings, nextAuditLogs),
      newAuditEntries
    );
  }, [auditLogs, categoryState, maybeSyncToSupabase, settings, transactions]);

  const resetDemoData = useCallback(() => {
    const timestamp = new Date().toISOString();
    const deleteEntries = transactions.map((transaction) =>
      createAuditEntry({
        action: "delete",
        actor: "admin",
        created_at: timestamp,
        entity_id: transaction.id,
        entity_type: "transaction",
        field_name: "",
        new_value: "",
        old_value: transactionSummary(transaction),
        reason: "Reset demo seed data.",
        source: "system"
      })
    );
    const createEntries = seedTransactions.map((transaction) =>
      createAuditEntry({
        action: "create",
        actor: "system",
        created_at: timestamp,
        entity_id: transaction.id,
        entity_type: "transaction",
        field_name: "",
        new_value: transactionSummary(transaction),
        old_value: "",
        reason: "Reset demo seed data.",
        source: "system"
      })
    );
    const settingEntries = buildSettingsAuditLogs(settings, defaultSettings, {
      actor: "admin",
      createdAt: timestamp,
      reason: "Reset demo seed data.",
      source: "system"
    });
    const newAuditEntries = [...deleteEntries, ...createEntries, ...settingEntries];
    const nextAuditLogs = mergeAuditLogs(auditLogs, newAuditEntries);

    setTransactions(seedTransactions);
    setSettings(defaultSettings);
    setCategoryState(categories);
    setAuditLogs(nextAuditLogs);
    maybeSyncToSupabase(
      createBackup(seedTransactions, categories, defaultSettings, nextAuditLogs),
      newAuditEntries
    );
  }, [auditLogs, maybeSyncToSupabase, settings, transactions]);

  const exportBackup = useCallback<() => LocalBackup>(() => {
    return createBackup(transactions, categoryState, settings, auditLogs, monthlyClosings);
  }, [auditLogs, categoryState, monthlyClosings, settings, transactions]);

  const importBackup = useCallback(
    (backup: LocalBackup) => {
      const normalized = normalizeBackup(backup);
      const nextAuditLogs = mergeAuditLogs(auditLogs, normalized.audit_logs);

      setTransactions(sortTransactions(normalized.transactions));
      setCategoryState(normalized.categories);
      setSettings(normalized.settings);
      setAuditLogs(nextAuditLogs);
      setMonthlyClosings(normalizeMonthlyClosings(normalized.monthly_closings));
      maybeSyncToSupabase(
        createBackup(
          normalized.transactions,
          normalized.categories,
          normalized.settings,
          nextAuditLogs,
          normalizeMonthlyClosings(normalized.monthly_closings)
        ),
        nextAuditLogs
      );
    },
    [auditLogs, maybeSyncToSupabase]
  );

  const value = useMemo<BookkeepingContextValue>(
    () => ({
      transactions,
      monthlyClosings,
      settings,
      categories: categoryState,
      auditLogs,
      storageStatus,
      addTransaction,
      bulkUpdateTransactions,
      importTransactions,
      updateTransaction,
      deleteTransaction,
      updateSettings,
      clearTransactions,
      resetDemoData,
      exportBackup,
      importBackup,
      syncToSupabase,
      loadFromSupabase,
      migrateLocalDataToSupabase,
      loadMonthlyClosings,
      closeMonth,
      reopenMonth,
      updateClosingSummary
    }),
    [
      addTransaction,
      auditLogs,
      bulkUpdateTransactions,
      categoryState,
      clearTransactions,
      deleteTransaction,
      exportBackup,
      importTransactions,
      importBackup,
      loadFromSupabase,
      loadMonthlyClosings,
      migrateLocalDataToSupabase,
      monthlyClosings,
      closeMonth,
      reopenMonth,
      resetDemoData,
      settings,
      storageStatus,
      syncToSupabase,
      transactions,
      updateClosingSummary,
      updateSettings,
      updateTransaction
    ]
  );

  return <BookkeepingContext.Provider value={value}>{children}</BookkeepingContext.Provider>;
}

export function useBookkeeping() {
  const context = useContext(BookkeepingContext);

  if (!context) {
    throw new Error("useBookkeeping must be used within BookkeepingProvider");
  }

  return context;
}
