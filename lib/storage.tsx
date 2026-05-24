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
  getReceiptRequiredDefault,
  normalizeCategoryReceiptDefault
} from "@/lib/receipt-requirements";
import { categories, defaultSettings, seedTransactions } from "@/lib/seed-data";
import type {
  AppSettings,
  Category,
  LocalBackup,
  StorageStatus,
  Transaction,
  TransactionDraft
} from "@/lib/types";

type BookkeepingContextValue = {
  transactions: Transaction[];
  settings: AppSettings;
  categories: Category[];
  storageStatus: StorageStatus;
  addTransaction: (transaction: TransactionDraft) => Transaction;
  bulkUpdateTransactions: (
    updates: Array<{ id: string; transaction: Partial<TransactionDraft> }>
  ) => void;
  importTransactions: (transactions: TransactionDraft[]) => Transaction[];
  updateTransaction: (id: string, transaction: Partial<TransactionDraft>) => void;
  deleteTransaction: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  clearTransactions: () => void;
  resetDemoData: () => void;
  exportBackup: () => LocalBackup;
  importBackup: (backup: LocalBackup) => void;
  syncToSupabase: () => Promise<boolean>;
  loadFromSupabase: () => Promise<boolean>;
  migrateLocalDataToSupabase: () => Promise<boolean>;
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

const TRANSACTIONS_KEY = "mercury-bookkeeping-transactions";
const SETTINGS_KEY = "mercury-bookkeeping-settings";
const CATEGORIES_KEY = "mercury-bookkeeping-categories";

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
    version: 1,
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
    settings: normalizeSettings(backup.settings)
  };
}

function createBackup(
  transactions: Transaction[],
  categoryState: Category[],
  settings: AppSettings
): LocalBackup {
  return {
    exported_at: new Date().toISOString(),
    version: 1,
    transactions,
    categories: categoryState,
    receipts: transactions.map((transaction) => ({
      transaction_id: transaction.id,
      receipt_required: transaction.receipt_required,
      receipt_link: transaction.receipt_link,
      reconciled: transaction.reconciled
    })),
    settings
  };
}

export function BookkeepingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categoryState, setCategoryState] = useState<Category[]>(categories);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(checkingStorageStatus);
  const [loaded, setLoaded] = useState(false);

  const applyBackup = useCallback((backup: Partial<LocalBackup>) => {
    const normalized = normalizeBackup(backup);

    setTransactions(normalized.transactions.sort((a, b) => b.date.localeCompare(a.date)));
    setCategoryState(normalized.categories);
    setSettings(normalized.settings);

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
  }, [applyBackup, requestStorage]);

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

  const maybeSyncToSupabase = useCallback(
    (backup: LocalBackup) => {
      if (storageStatus.configured && storageStatus.mode === "supabase") {
        void sendBackupToSupabase(backup);
      }
    },
    [sendBackupToSupabase, storageStatus.configured, storageStatus.mode]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localBackup = normalizeBackup({
        transactions: loadJson(TRANSACTIONS_KEY, seedTransactions),
        settings: loadJson(SETTINGS_KEY, defaultSettings),
        categories: loadJson(CATEGORIES_KEY, categories)
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

  const syncToSupabase = useCallback(async () => {
    return sendBackupToSupabase(createBackup(transactions, categoryState, settings));
  }, [categoryState, sendBackupToSupabase, settings, transactions]);

  const migrateLocalDataToSupabase = useCallback(async () => {
    const localBackup = normalizeBackup({
      transactions: loadJson(TRANSACTIONS_KEY, transactions),
      settings: loadJson(SETTINGS_KEY, settings),
      categories: loadJson(CATEGORIES_KEY, categoryState)
    });

    return sendBackupToSupabase(localBackup);
  }, [categoryState, sendBackupToSupabase, settings, transactions]);

  const addTransaction = useCallback(
    (draft: TransactionDraft) => {
      const now = new Date().toISOString();
      const transaction: Transaction = {
        ...draft,
        id: createId(),
        created_at: now,
        updated_at: now
      };
      const nextTransactions = [transaction, ...transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      setTransactions(nextTransactions);
      maybeSyncToSupabase(createBackup(nextTransactions, categoryState, settings));

      return transaction;
    },
    [categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const importTransactions = useCallback(
    (drafts: TransactionDraft[]) => {
      const now = new Date().toISOString();
      const importedTransactions = drafts.map((draft) => ({
        ...draft,
        id: createId(),
        created_at: now,
        updated_at: now
      }));
      const nextTransactions = [...importedTransactions, ...transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      setTransactions(nextTransactions);
      maybeSyncToSupabase(createBackup(nextTransactions, categoryState, settings));

      return importedTransactions;
    },
    [categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const updateTransaction = useCallback(
    (id: string, draft: Partial<TransactionDraft>) => {
      const nextTransactions = transactions.map((transaction) =>
        transaction.id === id
          ? { ...transaction, ...draft, updated_at: new Date().toISOString() }
          : transaction
      );

      setTransactions(nextTransactions);
      maybeSyncToSupabase(createBackup(nextTransactions, categoryState, settings));
    },
    [categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const bulkUpdateTransactions = useCallback(
    (updates: Array<{ id: string; transaction: Partial<TransactionDraft> }>) => {
      if (updates.length === 0) return;

      const patchById = new Map(
        updates.map((update) => [update.id, update.transaction] satisfies [string, Partial<TransactionDraft>])
      );
      const timestamp = new Date().toISOString();
      const nextTransactions = transactions.map((transaction) =>
        patchById.has(transaction.id)
          ? {
              ...transaction,
              ...patchById.get(transaction.id),
              updated_at: timestamp
            }
          : transaction
      );

      setTransactions(nextTransactions);
      maybeSyncToSupabase(createBackup(nextTransactions, categoryState, settings));
    },
    [categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const nextTransactions = transactions.filter((transaction) => transaction.id !== id);

      setTransactions(nextTransactions);
      maybeSyncToSupabase(createBackup(nextTransactions, categoryState, settings));
    },
    [categoryState, maybeSyncToSupabase, settings, transactions]
  );

  const updateSettings = useCallback(
    (nextSettings: AppSettings) => {
      const normalized = normalizeSettings(nextSettings);

      setSettings(normalized);
      maybeSyncToSupabase(createBackup(transactions, categoryState, normalized));
    },
    [categoryState, maybeSyncToSupabase, transactions]
  );

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    maybeSyncToSupabase(createBackup([], categoryState, settings));
  }, [categoryState, maybeSyncToSupabase, settings]);

  const resetDemoData = useCallback(() => {
    setTransactions(seedTransactions);
    setSettings(defaultSettings);
    setCategoryState(categories);
    maybeSyncToSupabase(createBackup(seedTransactions, categories, defaultSettings));
  }, [maybeSyncToSupabase]);

  const exportBackup = useCallback<() => LocalBackup>(() => {
    return createBackup(transactions, categoryState, settings);
  }, [categoryState, settings, transactions]);

  const importBackup = useCallback(
    (backup: LocalBackup) => {
      const normalized = applyBackup(backup);

      maybeSyncToSupabase(normalized);
    },
    [applyBackup, maybeSyncToSupabase]
  );

  const value = useMemo<BookkeepingContextValue>(
    () => ({
      transactions,
      settings,
      categories: categoryState,
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
      migrateLocalDataToSupabase
    }),
    [
      addTransaction,
      bulkUpdateTransactions,
      categoryState,
      clearTransactions,
      deleteTransaction,
      exportBackup,
      importTransactions,
      importBackup,
      loadFromSupabase,
      migrateLocalDataToSupabase,
      resetDemoData,
      settings,
      storageStatus,
      syncToSupabase,
      transactions,
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
