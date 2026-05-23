export type CategoryType = "Revenue" | "COGS" | "Expense" | "Equity" | "Transfer";
export type Language = "en" | "zh";

export type Transaction = {
  id: string;
  date: string;
  account: string;
  source: string;
  vendor: string;
  description: string;
  currency: string;
  money_in: number;
  money_out: number;
  category: string;
  tax_line: string;
  receipt_required: boolean;
  receipt_link: string;
  reconciled: boolean;
  notes: string;
  created_at: string;
  updated_at?: string;
};

export type TransactionDraft = Omit<Transaction, "id" | "created_at" | "updated_at">;

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  tax_line: string;
  receipt_required_default: boolean;
  description: string;
};

export type AppSettings = {
  company_name: string;
  entity_type: string;
  tax_year: number;
  default_currency: string;
  default_account: string;
  bookkeeping_method: "cash" | "accrual";
  business_type_tax_notes: string;
  language: Language;
};

export type LocalBackup = {
  exported_at: string;
  version: 1;
  transactions: Transaction[];
  categories: Category[];
  receipts: Array<{
    transaction_id: string;
    receipt_required: boolean;
    receipt_link: string;
    reconciled: boolean;
  }>;
  settings: AppSettings;
};

export type StorageMode = "checking" | "local" | "supabase" | "error";

export type StorageStatus = {
  configured: boolean;
  mode: StorageMode;
  message: string;
};

export type PeriodSummary = {
  revenue: number;
  cogs: number;
  expenses: number;
  owner_contributions: number;
  owner_draws: number;
  investment_transfers: number;
  net_income: number;
  gross_profit: number;
  cash_net: number;
};

export type ReportRow = {
  label: string;
  type: CategoryType | "Tax";
  money_in: number;
  money_out: number;
  net: number;
};
