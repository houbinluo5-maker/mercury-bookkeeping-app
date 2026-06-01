import type {
  AppSettings,
  AuditAction,
  AuditActor,
  AuditDetails,
  AuditDetailValue,
  AuditEntityType,
  AuditLog,
  AuditSource,
  Transaction,
  TransactionDraft,
  WorkspaceRole
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
  "settings_updated",
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
  "month_closed",
  "month_reopened",
  "close_note_updated",
  "workspace_claimed",
  "workspace_switched",
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
  actorEmail?: string;
  actorRole?: WorkspaceRole | "unknown";
  actorUserId?: string;
  createdAt?: string;
  details?: AuditDetails;
  entityTypesByField?: Partial<Record<string, AuditEntityType>>;
  extraEntries?: Array<Partial<AuditLog>>;
  reason?: string;
  source?: AuditSource;
  fieldReasons?: Partial<Record<string, string>>;
  workspaceId?: string;
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

const sensitiveAuditKeyPattern =
  /(access[_-]?token|refresh[_-]?token|authorization|api[_-]?key|apikey|service[_-]?role|secret|password|client[_-]?secret|code[_-]?verifier|oauth[_-]?code|cookie|token)/i;

export function scrubSensitiveAuditText(value: string) {
  return value
    .replace(
      /\b(access[_-]?token|refresh[_-]?token|code[_-]?verifier|client[_-]?secret|api[_-]?key|apikey|authorization|cookie|password|service[_-]?role)=([^&\s]+)/gi,
      "$1=[redacted]"
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 1000);
}

function sanitizeAuditDetailValue(value: unknown, depth = 0): AuditDetailValue {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return null;

  if (typeof value === "string") return scrubSensitiveAuditText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeAuditDetailValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, entryValue]) => [
        scrubSensitiveAuditText(key).slice(0, 80),
        sensitiveAuditKeyPattern.test(key)
          ? "[redacted]"
          : sanitizeAuditDetailValue(entryValue, depth + 1)
      ])
    );
  }

  return scrubSensitiveAuditText(String(value));
}

export function sanitizeAuditDetails(value: unknown): AuditDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return sanitizeAuditDetailValue(value) as AuditDetails;
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
    entity_id: scrubSensitiveAuditText(String(log.entity_id ?? "")),
    action: log.action ?? "update",
    field_name: scrubSensitiveAuditText(String(log.field_name ?? "")),
    old_value: scrubSensitiveAuditText(String(log.old_value ?? "")),
    new_value: scrubSensitiveAuditText(String(log.new_value ?? "")),
    reason: scrubSensitiveAuditText(String(log.reason ?? "")),
    created_at: log.created_at || new Date().toISOString(),
    actor: log.actor ?? "admin",
    source: log.source ?? "manual",
    actor_email: log.actor_email ? scrubSensitiveAuditText(log.actor_email) : undefined,
    actor_role: log.actor_role ?? "unknown",
    actor_user_id: log.actor_user_id ? scrubSensitiveAuditText(log.actor_user_id) : undefined,
    details: sanitizeAuditDetails(log.details),
    workspace_id: log.workspace_id ? scrubSensitiveAuditText(log.workspace_id) : undefined
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
  const action = options.actionsByField?.[fieldName] ?? defaultActionForField(fieldName, oldValue, newValue);
  const entityType =
    options.entityTypesByField?.[fieldName] ?? defaultEntityTypeForField(fieldName);

  return normalizeAuditLog({
    action,
    actor: options.actor ?? "admin",
    actor_email: options.actorEmail,
    actor_role: options.actorRole,
    actor_user_id: options.actorUserId,
    created_at: options.createdAt,
    entity_id: entityId,
    entity_type: entityType,
    field_name: fieldName,
    new_value: newValue,
    old_value: oldValue,
    reason: options.fieldReasons?.[fieldName] ?? options.reason ?? "",
    source: options.source ?? "manual",
    details: {
      ...options.details,
      action,
      entity_type: entityType,
      field_name: fieldName,
      new_value: newValue,
      old_value: oldValue,
      result: "success"
    },
    workspace_id: options.workspaceId
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
        actor_email: entry.actor_email ?? options.actorEmail,
        actor_role: entry.actor_role ?? options.actorRole,
        actor_user_id: entry.actor_user_id ?? options.actorUserId,
        created_at: entry.created_at ?? options.createdAt,
        details: {
          ...options.details,
          ...sanitizeAuditDetails(entry.details),
          result: "success"
        },
        entity_id: entry.entity_id ?? next.id,
        entity_type: entry.entity_type ?? "transaction",
        field_name: entry.field_name ?? "",
        new_value: entry.new_value ?? "",
        old_value: entry.old_value ?? "",
        reason: entry.reason ?? options.reason ?? "",
        source: entry.source ?? options.source ?? "manual",
        id: entry.id,
        workspace_id: entry.workspace_id ?? options.workspaceId
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
        action: options.actionsByField?.[fieldName] ?? "settings_updated",
        actor: options.actor ?? "admin",
        actor_email: options.actorEmail,
        actor_role: options.actorRole,
        actor_user_id: options.actorUserId,
        created_at: options.createdAt,
        details: {
          ...options.details,
          field_name: fieldName,
          new_value: newValue,
          old_value: oldValue,
          result: "success"
        },
        entity_id: "default",
        entity_type: "settings",
        field_name: fieldName,
        new_value: newValue,
        old_value: oldValue,
        reason: options.fieldReasons?.[fieldName] ?? options.reason ?? "",
        source: options.source ?? "manual",
        workspace_id: options.workspaceId
      })
    ];
  });

  return mergeAuditLogs(
    entries,
    options.extraEntries?.map((entry) =>
      createAuditEntry({
        action: entry.action ?? "settings_updated",
        actor: entry.actor ?? options.actor ?? "admin",
        actor_email: entry.actor_email ?? options.actorEmail,
        actor_role: entry.actor_role ?? options.actorRole,
        actor_user_id: entry.actor_user_id ?? options.actorUserId,
        created_at: entry.created_at ?? options.createdAt,
        details: {
          ...options.details,
          ...sanitizeAuditDetails(entry.details),
          result: "success"
        },
        entity_id: entry.entity_id ?? "default",
        entity_type: entry.entity_type ?? "settings",
        field_name: entry.field_name ?? "",
        new_value: entry.new_value ?? "",
        old_value: entry.old_value ?? "",
        reason: entry.reason ?? options.reason ?? "",
        source: entry.source ?? options.source ?? "manual",
        id: entry.id,
        workspace_id: entry.workspace_id ?? options.workspaceId
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

function detailText(entry: AuditLog, key: string) {
  const value = entry.details?.[key];

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return "";
}

function parsedNewValue(entry: AuditLog) {
  if (!entry.new_value || !entry.new_value.trim().startsWith("{")) return {};

  try {
    return sanitizeAuditDetails(JSON.parse(entry.new_value)) as Record<string, AuditDetailValue>;
  } catch {
    return {};
  }
}

function exportTypeLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function auditResult(entry: AuditLog): "denied" | "success" {
  const detailsResult = detailText(entry, "result");
  if (detailsResult === "denied" || entry.action === "export_denied" || entry.action === "permission_denied") {
    return "denied";
  }

  return "success";
}

export function auditBadgeLabels(entry: AuditLog) {
  const labels = new Set<string>();
  labels.add(auditResult(entry) === "denied" ? "Denied" : "Success");

  if (entry.action.includes("export")) labels.add("Export");
  if (entry.action.startsWith("member_") || entry.action.startsWith("invitation_")) labels.add("Team");
  if (entry.entity_type === "receipt" || entry.action.includes("receipt")) labels.add("Receipt");
  if (entry.entity_type === "transaction" || entry.action.includes("transaction")) labels.add("Transaction");
  if (entry.action.startsWith("month_") || entry.action === "close_note_updated") labels.add("Month close");
  if (entry.action === "permission_denied" || entry.action === "export_denied") labels.add("Security");

  return Array.from(labels);
}

export function describeAuditEntry(entry: AuditLog) {
  const details = { ...parsedNewValue(entry), ...(entry.details ?? {}) };
  const exportType = String(details.export_type ?? entry.field_name ?? "");
  const reportPeriod = String(details.report_period ?? "");

  if (entry.action === "member_role_changed") {
    return `Changed role from ${displayAuditValue(entry.old_value)} to ${displayAuditValue(entry.new_value)}.`;
  }

  if (entry.action === "workspace_switched") {
    const fromWorkspace = String(details.from_workspace_id ?? entry.old_value);
    const toWorkspace = String(details.to_workspace_id ?? entry.new_value);
    return `Switched workspace from ${displayAuditValue(fromWorkspace)} to ${displayAuditValue(toWorkspace)}.`;
  }

  if (entry.action === "permission_denied") {
    return `Denied permission attempt: ${entry.new_value || entry.field_name || "restricted action"}.`;
  }

  if (entry.action === "export_denied") {
    return `Denied export attempt: ${displayAuditValue(entry.old_value)} cannot export ${exportTypeLabel(exportType || "this data")}.`;
  }

  if (entry.action.endsWith("_exported") || entry.action === "report_exported") {
    return `Exported ${exportTypeLabel(exportType || entry.action)}${reportPeriod ? ` for ${reportPeriod}` : ""}.`;
  }

  if (entry.action === "month_closed") return `Closed month ${entry.entity_id}.`;
  if (entry.action === "month_reopened") return `Reopened month ${entry.entity_id}.`;
  if (entry.action === "close_note_updated") return `Updated close note for ${entry.entity_id}.`;
  if (entry.action === "mark_reconciled") return "Marked transaction reconciled.";
  if (entry.action === "mark_unreconciled") return "Marked transaction unreconciled.";
  if (entry.action === "mark_receipt_not_required") return "Marked receipt not required.";
  if (entry.action === "resolve_review") return "Resolved review item.";
  if (entry.action === "dismiss_duplicate") return "Dismissed duplicate candidate.";
  if (entry.action === "upload_receipt") return "Uploaded receipt file.";
  if (entry.action === "replace_receipt") return "Replaced receipt file.";
  if (entry.action === "delete_receipt") return "Deleted receipt file.";
  if (entry.action === "manual_link_receipt") return "Linked receipt manually.";
  if (entry.action === "category_change") {
    return `Changed category from ${displayAuditValue(entry.old_value)} to ${displayAuditValue(entry.new_value)}.`;
  }
  if (entry.action === "tax_line_change") {
    return `Changed tax line from ${displayAuditValue(entry.old_value)} to ${displayAuditValue(entry.new_value)}.`;
  }
  if (entry.action === "note_change") return "Updated transaction note.";
  if (entry.action === "settings_updated") {
    return `Updated ${entry.field_name || "workspace settings"}.`;
  }
  if (entry.action === "workspace_claimed") return "Claimed legacy workspace.";
  if (entry.action === "member_invited") return `Invited workspace member${entry.new_value ? `: ${entry.new_value}` : ""}.`;
  if (entry.action === "invitation_accepted") return "Accepted workspace invitation.";
  if (entry.action === "invitation_revoked") return "Revoked workspace invitation.";
  if (entry.action === "member_removed") return "Removed workspace member.";

  if (entry.field_name) {
    return `Changed ${entry.field_name} from ${displayAuditValue(entry.old_value)} to ${displayAuditValue(entry.new_value)}.`;
  }

  return entry.reason || `${entry.action.replace(/_/g, " ")}.`;
}

const reportExportActions: AuditAction[] = [
  "report_exported",
  "tax_package_exported",
  "transactions_exported",
  "receipts_exported",
  "export_denied"
];

export function auditLogVisibleForRole(entry: AuditLog, role: WorkspaceRole | "unknown" | null | undefined) {
  if (!role || role === "unknown") return false;
  if (role === "owner") return true;

  const operationalEntity =
    entry.entity_type === "transaction" ||
    entry.entity_type === "receipt" ||
    entry.entity_type === "reconciliation" ||
    entry.entity_type === "category";
  const teamInviteEvent = entry.action === "member_invited" || entry.action === "invitation_accepted";
  const reportExportEvent = reportExportActions.includes(entry.action);

  if (role === "admin" || role === "bookkeeper") {
    return operationalEntity || reportExportEvent || teamInviteEvent || entry.action === "permission_denied";
  }

  if (role === "cpa" || role === "viewer") {
    return operationalEntity || reportExportEvent;
  }

  return false;
}

export function filterAuditLogsForRole(
  entries: AuditLog[],
  role: WorkspaceRole | "unknown" | null | undefined
) {
  return entries.filter((entry) => auditLogVisibleForRole(entry, role));
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
