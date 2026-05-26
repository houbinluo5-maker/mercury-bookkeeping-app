export type CategoryType = "Revenue" | "COGS" | "Expense" | "Equity" | "Transfer";
export type Language = "en" | "zh";
export type AuditEntityType =
  | "transaction"
  | "receipt"
  | "settings"
  | "category"
  | "reconciliation"
  | "workspace";
export type AuditActor = "admin" | "system" | string;
export type AuditSource =
  | "manual"
  | "import"
  | "system"
  | "csv_import"
  | "receipt_upload"
  | "oauth_signup";
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
  | "note_change"
  | "workspace_claimed"
  | "member_invited"
  | "invitation_accepted"
  | "invitation_revoked"
  | "member_removed"
  | "member_role_changed";

export type WorkspaceRole = "owner" | "admin" | "viewer" | "cpa" | "bookkeeper";
export type WorkspaceMemberStatus = "active" | "invited" | "revoked";
export type WorkspaceInvitationStatus = "invited" | "accepted" | "revoked" | "expired";

export type MonthlyClosingStatus = "open" | "ready_to_close" | "closed" | "reopened";

export type Transaction = {
  id: string;
  workspace_id?: string;
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
  workspace_id?: string;
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
  workspace_id?: string;
  actor_user_id?: string;
  actor_email?: string;
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

export type MonthlyClosingSummaryJson = {
  audit_log_count?: number;
  backup_exported?: boolean;
  checklist?: Record<string, boolean>;
  closed_period_change_count?: number;
  expenses: number;
  missing_receipts_count: number;
  needs_review_count: number;
  net_income: number;
  possible_duplicates_count: number;
  revenue: number;
  total_transactions: number;
  uncategorized_count: number;
  unreconciled_count: number;
};

export type MonthlyClosing = {
  id: string;
  workspace_id?: string;
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  status: MonthlyClosingStatus;
  readiness_score: number;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  close_reason: string;
  reopen_reason: string;
  summary_json: MonthlyClosingSummaryJson;
  created_at: string;
  updated_at: string;
};

export type LocalBackup = {
  exported_at: string;
  version: 1 | 2 | 3;
  transactions: Transaction[];
  categories: Category[];
  receipts: Array<{
    transaction_id: string;
    receipt_required: boolean;
    receipt_link: string;
    reconciled: boolean;
  }>;
  audit_logs: AuditLog[];
  monthly_closings?: MonthlyClosing[];
  settings: AppSettings;
};

export type StorageMode = "checking" | "local" | "supabase" | "error";

export type StorageStatus = {
  apiStatus?: number;
  apiStatusText?: string;
  configured: boolean;
  error?: string;
  lastCheckedAt?: string;
  mode: StorageMode;
  message: string;
  notice?: string;
  supabaseConnected?: boolean;
  health?: SupabaseHealthCheck;
};

export type SupabaseHealthCheck = {
  audit_logs: "ok" | "error";
  checked_at: string;
  connected: boolean;
  error: string;
  monthly_closings: "ok" | "missing" | "error";
  service_role_key: "ok" | "missing" | "error";
  supabase_url: "ok" | "missing";
  transactions: "ok" | "error";
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  auth_provider: string;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  business_type: string;
  tax_year: number;
  default_currency: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email?: string;
  normalized_email?: string;
  role: WorkspaceRole;
  status?: WorkspaceMemberStatus;
  invited_by?: string | null;
  invited_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  normalized_email: string;
  role: Exclude<WorkspaceRole, "owner" | "bookkeeper">;
  token: string;
  status: WorkspaceInvitationStatus;
  expires_at: string;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
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
