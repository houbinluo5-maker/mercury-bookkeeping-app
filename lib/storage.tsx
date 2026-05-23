"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { categories, defaultSettings, seedTransactions } from "@/lib/seed-data";
import type { AppSettings, Category, LocalBackup, Transaction, TransactionDraft } from "@/lib/types";

type BookkeepingContextValue = {
  transactions: Transaction[];
  settings: AppSettings;
  categories: Category[];
  addTransaction: (transaction: TransactionDraft) => Transaction;
  updateTransaction: (id: string, transaction: Partial<TransactionDraft>) => void;
  deleteTransaction: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  clearTransactions: () => void;
  resetDemoData: () => void;
  exportBackup: () => LocalBackup;
  importBackup: (backup: LocalBackup) => void;
};

const TRANSACTIONS_KEY = "mercury-bookkeeping-transactions";
const SETTINGS_KEY = "mercury-bookkeeping-settings";
const CATEGORIES_KEY = "mercury-bookkeeping-categories";

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

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...settings
  };
}

function normalizeBackup(backup: LocalBackup): LocalBackup {
  return {
    exported_at: backup.exported_at || new Date().toISOString(),
    version: 1,
    transactions: Array.isArray(backup.transactions) ? backup.transactions : [],
    categories: Array.isArray(backup.categories) ? backup.categories : categories,
    receipts: Array.isArray(backup.receipts) ? backup.receipts : [],
    settings: normalizeSettings(backup.settings ?? defaultSettings)
  };
}

export function BookkeepingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categoryState, setCategoryState] = useState<Category[]>(categories);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTransactions(loadJson(TRANSACTIONS_KEY, seedTransactions));
      setSettings(normalizeSettings(loadJson(SETTINGS_KEY, defaultSettings)));
      setCategoryState(loadJson(CATEGORIES_KEY, categories));
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

  const addTransaction = useCallback((draft: TransactionDraft) => {
    const transaction: Transaction = {
      ...draft,
      id: createId(),
      created_at: new Date().toISOString()
    };

    setTransactions((current) =>
      [transaction, ...current].sort((a, b) => b.date.localeCompare(a.date))
    );

    return transaction;
  }, []);

  const updateTransaction = useCallback((id: string, draft: Partial<TransactionDraft>) => {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id ? { ...transaction, ...draft } : transaction
      )
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
  }, []);

  const updateSettings = useCallback((nextSettings: AppSettings) => {
    setSettings(normalizeSettings(nextSettings));
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const resetDemoData = useCallback(() => {
    setTransactions(seedTransactions);
    setSettings(defaultSettings);
    setCategoryState(categories);
  }, []);

  const exportBackup = useCallback<() => LocalBackup>(() => {
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
  }, [categoryState, settings, transactions]);

  const importBackup = useCallback((backup: LocalBackup) => {
    const normalized = normalizeBackup(backup);

    setTransactions(normalized.transactions);
    setCategoryState(normalized.categories);
    setSettings(normalized.settings);
  }, []);

  const value = useMemo<BookkeepingContextValue>(
    () => ({
      transactions,
      settings,
      categories: categoryState,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      updateSettings,
      clearTransactions,
      resetDemoData,
      exportBackup,
      importBackup
    }),
    [
      addTransaction,
      categoryState,
      clearTransactions,
      deleteTransaction,
      exportBackup,
      importBackup,
      resetDemoData,
      settings,
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
