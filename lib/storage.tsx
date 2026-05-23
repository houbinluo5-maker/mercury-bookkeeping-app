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
import type { AppSettings, Transaction, TransactionDraft } from "@/lib/types";

type BookkeepingContextValue = {
  transactions: Transaction[];
  settings: AppSettings;
  categories: typeof categories;
  addTransaction: (transaction: TransactionDraft) => Transaction;
  updateTransaction: (id: string, transaction: Partial<TransactionDraft>) => void;
  updateSettings: (settings: AppSettings) => void;
  resetDemoData: () => void;
};

const TRANSACTIONS_KEY = "mercury-bookkeeping-transactions";
const SETTINGS_KEY = "mercury-bookkeeping-settings";

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

export function BookkeepingProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTransactions(loadJson(TRANSACTIONS_KEY, seedTransactions));
      setSettings(loadJson(SETTINGS_KEY, defaultSettings));
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

  const updateSettings = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
  }, []);

  const resetDemoData = useCallback(() => {
    setTransactions(seedTransactions);
    setSettings(defaultSettings);
  }, []);

  const value = useMemo<BookkeepingContextValue>(
    () => ({
      transactions,
      settings,
      categories,
      addTransaction,
      updateTransaction,
      updateSettings,
      resetDemoData
    }),
    [addTransaction, resetDemoData, settings, transactions, updateSettings, updateTransaction]
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
