export type CategoryType = "Revenue" | "COGS" | "Expense" | "Equity" | "Transfer";
export type Language = "en" | "zh";
export type AuditEntityType =
  | "transaction"
  | "receipt"
  | "settings"
  | "category"
  | "reconciliation";
export type AuditActor = "admin" | "system";
export type AuditSource = "manual" | "import" | "system" | "csv_import" | "receipt_upload";
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "upload_receipt"
  | "replace_receipt"
  | "delete_receipt"
  | "manual_link_receipt"
  | "mark_reconciled"
  | "mark_unreconciled"
  | "mark_receipt_not_required"
  | "category_change"
  | "tax_line_change"
  | "resolve_review"
  | "dismiss_duplicate"
  | "note_change";

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

export type AuditLog = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
  actor: AuditActor;
  source: AuditSource;
};

export type LocalBackup = {
  exported_at: string;
  version: 1 | 2;
  transactions: Transaction[];
  categories: Category[];
  receipts: Array<{
    transaction_id: string;
    receipt_required: boolean;
    receipt_link: string;
    reconciled: boolean;
  }>;
  audit_logs: AuditLog[];
  settings: AppSettings;
};

export type StorageMode = "checking" | "local" | "supabase" | "error";

export type StorageStatus = {
  apiStatus?: number;
  apiStatusText?: string;
  configured: boolean;
  error?: string;
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
