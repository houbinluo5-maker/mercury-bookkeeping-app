import type {
  AppSettings,
  AuditAction,
  AuditActor,
  AuditEntityType,
  AuditLog,
  AuditSource,
  Transaction,
  TransactionDraft
} from "@/lib/types";

export const auditEntityTypes: AuditEntityType[] = [
  "transaction",
  "receipt",
  "settings",
  "category",
  "reconciliation",
  "workspace"
];

export const auditActions: AuditAction[] = [
  "create",
  "update",
  "delete",
  "upload_receipt",
  "replace_receipt",
  "delete_receipt",
  "manual_link_receipt",
  "mark_reconciled",
  "mark_unreconciled",
  "mark_receipt_not_required",
  "category_change",
  "tax_line_change",
  "resolve_review",
  "dismiss_duplicate",
  "note_change",
  "workspace_claimed",
  "member_invited",
  "invitation_accepted",
  "invitation_revoked",
  "member_removed",
  "member_role_changed",
  "permission_denied",
  "report_exported",
  "tax_package_exported",
  "transactions_exported",
  "receipts_exported",
  "workspace_backup_exported",
  "export_denied"
];

export const auditSources: AuditSource[] = [
  "manual",
  "import",
  "system",
  "csv_import",
  "receipt_upload",
  "oauth_signup"
];

const trackedTransactionFields = [
  "date",
  "vendor",
  "source",
  "description",
  "money_in",
  "money_out",
  "category",
  "tax_line",
  "receipt_required",
  "receipt_link",
  "reconciled",
  "notes"
] as const;

const trackedSettingsFields = [
  "company_name",
  "entity_type",
  "tax_year",
  "default_currency",
  "default_account",
  "bookkeeping_method",
  "business_type_tax_notes",
  "language"
] as const;

type AuditOverrideOptions = {
  actionsByField?: Partial<Record<string, AuditAction>>;
  actor?: AuditActor;
  createdAt?: string;
  entityTypesByField?: Partial<Record<string, AuditEntityType>>;
  extraEntries?: Array<Partial<AuditLog>>;
  reason?: string;
  source?: AuditSource;
  fieldReasons?: Partial<Record<string, string>>;
};

export type TransactionAuditOptions = AuditOverrideOptions;
export type SettingsAuditOptions = AuditOverrideOptions;

function createFallbackId() {
  return `audit-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function createAuditId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return createFallbackId();
}

function asAuditValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  return String(value);
}

function defaultEntityTypeForField(fieldName: string): AuditEntityType {
  if (fieldName === "category" || fieldName === "tax_line") return "category";
  if (fieldName === "receipt_link" || fieldName === "receipt_required") return "receipt";
  if (fieldName === "reconciled") return "reconciliation";
  return "transaction";
}

function defaultActionForField(
  fieldName: string,
  oldValue: string,
  newValue: string
): AuditAction {
  if (fieldName === "category") return "category_change";
  if (fieldName === "tax_line") return "tax_line_change";
  if (fieldName === "receipt_required") {
    return newValue === "false" ? "mark_receipt_not_required" : "update";
  }
  if (fieldName === "reconciled") {
    return newValue === "true" ? "mark_reconciled" : "mark_unreconciled";
  }
  if (fieldName === "receipt_link") {
    if (!oldValue && newValue) return "manual_link_receipt";
    if (oldValue && !newValue) return "delete_receipt";
    if (oldValue && newValue && oldValue !== newValue) return "replace_receipt";
  }
  if (fieldName === "notes") return "note_change";

  return "update";
}

function normalizeAuditLog(log: Partial<AuditLog>): AuditLog {
  return {
    id: log.id || createAuditId(),
    entity_type: log.entity_type ?? "transaction",
    entity_id: String(log.entity_id ?? ""),
    action: log.action ?? "update",
    field_name: String(log.field_name ?? ""),
    old_value: String(log.old_value ?? ""),
    new_value: String(log.new_value ?? ""),
    reason: String(log.reason ?? ""),
    created_at: log.created_at || new Date().toISOString(),
    actor: log.actor ?? "admin",
    source: log.source ?? "manual",
    actor_email: log.actor_email,
    actor_user_id: log.actor_user_id,
    workspace_id: log.workspace_id
  };
}

export function mergeAuditLogs(...groups: Array<AuditLog[] | null | undefined>) {
  const merged = new Map<string, AuditLog>();

  groups.flat().filter(Boolean).forEach((entry) => {
    const normalized = normalizeAuditLog(entry as AuditLog);
    merged.set(normalized.id, normalized);
  });

  return Array.from(merged.values()).sort(
    (left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id)
  );
}

export function transactionSummary(transaction: Pick<Transaction, "date" | "vendor" | "description" | "money_in" | "money_out" | "category" | "currency">) {
  const amount = transaction.money_in > 0 ? transaction.money_in : transaction.money_out;
  const direction = transaction.money_in > 0 ? "in" : "out";

  return [
    transaction.date,
    transaction.vendor || transaction.description || "Transaction",
    `${direction} ${amount} ${transaction.currency}`,
    transaction.category
  ]
    .filter(Boolean)
    .join(" | ");
}

export function createAuditEntry(
  input: Omit<AuditLog, "created_at" | "id"> & { created_at?: string; id?: string }
) {
  return normalizeAuditLog(input);
}

function buildFieldEntry(
  entityId: string,
  fieldName: string,
  oldValue: string,
  newValue: string,
  options: AuditOverrideOptions
) {
  return normalizeAuditLog({
    action: options.actionsByField?.[fieldName] ?? defaultActionForField(fieldName, oldValue, newValue),
    actor: options.actor ?? "admin",
    created_at: options.createdAt,
    entity_id: entityId,
    entity_type:
      options.entityTypesByField?.[fieldName] ?? defaultEntityTypeForField(fieldName),
    field_name: fieldName,
    new_value: newValue,
    old_value: oldValue,
    reason: options.fieldReasons?.[fieldName] ?? options.reason ?? "",
    source: options.source ?? "manual"
  });
}

export function buildTransactionAuditLogs(
  previous: Transaction,
  next: Transaction,
  options: TransactionAuditOptions = {}
) {
  const entries = trackedTransactionFields.flatMap((fieldName) => {
    const oldValue = asAuditValue(previous[fieldName]);
    const newValue = asAuditValue(next[fieldName]);

    if (oldValue === newValue) return [];

    return [buildFieldEntry(next.id, fieldName, oldValue, newValue, options)];
  });

  return mergeAuditLogs(
    entries,
    options.extraEntries?.map((entry) =>
      createAuditEntry({
        action: entry.action ?? "update",
        actor: entry.actor ?? options.actor ?? "admin",
        created_at: entry.created_at ?? options.createdAt,
        entity_id: entry.entity_id ?? next.id,
        entity_type: entry.entity_type ?? "transaction",
        field_name: entry.field_name ?? "",
        new_value: entry.new_value ?? "",
        old_value: entry.old_value ?? "",
        reason: entry.reason ?? options.reason ?? "",
        source: entry.source ?? options.source ?? "manual",
        id: entry.id
      })
    )
  );
}

export function buildSettingsAuditLogs(
  previous: AppSettings,
  next: AppSettings,
  options: SettingsAuditOptions = {}
) {
  const entries = trackedSettingsFields.flatMap((fieldName) => {
    const oldValue = asAuditValue(previous[fieldName]);
    const newValue = asAuditValue(next[fieldName]);

    if (oldValue === newValue) return [];

    return [
      createAuditEntry({
        action: options.actionsByField?.[fieldName] ?? "update",
        actor: options.actor ?? "admin",
        created_at: options.createdAt,
        entity_id: "default",
        entity_type: "settings",
        field_name: fieldName,
        new_value: newValue,
        old_value: oldValue,
        reason: options.fieldReasons?.[fieldName] ?? options.reason ?? "",
        source: options.source ?? "manual"
      })
    ];
  });

  return mergeAuditLogs(
    entries,
    options.extraEntries?.map((entry) =>
      createAuditEntry({
        action: entry.action ?? "update",
        actor: entry.actor ?? options.actor ?? "admin",
        created_at: entry.created_at ?? options.createdAt,
        entity_id: entry.entity_id ?? "default",
        entity_type: entry.entity_type ?? "settings",
        field_name: entry.field_name ?? "",
        new_value: entry.new_value ?? "",
        old_value: entry.old_value ?? "",
        reason: entry.reason ?? options.reason ?? "",
        source: entry.source ?? options.source ?? "manual",
        id: entry.id
      })
    )
  );
}

export function normalizeAuditLogs(input: unknown): AuditLog[] {
  if (!Array.isArray(input)) return [];

  return mergeAuditLogs(
    input.map((entry) => normalizeAuditLog((entry ?? {}) as Partial<AuditLog>))
  );
}

export function isSensitiveTransactionField(fieldName: keyof TransactionDraft | string) {
  return [
    "money_in",
    "money_out",
    "category",
    "tax_line",
    "receipt_required",
    "reconciled",
    "receipt_link"
  ].includes(fieldName);
}

export function hasMeaningfulReason(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function displayAuditValue(value: string) {
  if (!value) return "-";
  if (value === "true") return "True";
  if (value === "false") return "False";

  return value;
}

export function auditActionLabelKey(action: AuditAction) {
  return `auditAction.${action}`;
}

export function auditEntityLabelKey(entityType: AuditEntityType) {
  return `auditEntity.${entityType}`;
}

export function auditSourceLabelKey(source: AuditSource) {
  return `auditSource.${source}`;
}

export function auditFieldLabelKey(fieldName: string) {
  const map: Record<string, string> = {
    business_type_tax_notes: "businessTypeTaxNotes",
    category: "category",
    company_name: "companyName",
    date: "date",
    default_account: "defaultAccountName",
    default_currency: "defaultCurrency",
    description: "description",
    duplicate_status: "duplicateWarning",
    entity_type: "businessType",
    field_name: "fieldName",
    language: "language",
    money_in: "moneyIn",
    money_out: "moneyOut",
    notes: "notes",
    receipt_link: "receiptLink",
    receipt_required: "receiptRequired",
    reconciled: "reconciled",
    review_status: "reviewStatus",
    source: "source",
    tax_line: "taxLine",
    tax_year: "taxYear",
    vendor: "vendor"
  };

  return map[fieldName] ?? "";
}
