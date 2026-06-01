import type { AppSettings, WorkspaceMember, WorkspaceRole } from "@/lib/types";

export const ownerSettingsFields = [
  "workspace_name",
  "company_name",
  "company_legal_name",
  "dba_name",
  "business_type",
  "entity_type",
  "ein_tax_id",
  "registered_state",
  "business_address",
  "contact_email",
  "finance_contact_name",
  "tax_year",
  "default_currency",
  "default_account",
  "bookkeeping_method",
  "business_type_tax_notes",
  "country_region",
  "timezone_display",
  "language",
  "lock_closed_months",
  "allow_admins_reopen_months",
  "cpa_read_only_note",
  "data_retention_policy",
  "receipt_retention_policy",
  "export_watermark_preference"
] as const satisfies ReadonlyArray<keyof AppSettings>;

export const operationalSettingsFields = [
  "require_receipts_over_threshold",
  "receipt_required_threshold_amount",
  "monthly_close_reminder_day",
  "default_category_fallback"
] as const satisfies ReadonlyArray<keyof AppSettings>;

export type SettingsField = keyof AppSettings;
export type SettingsSection =
  | "workspace_profile"
  | "company_information"
  | "finance_operations"
  | "security_access"
  | "data_compliance";

const ownerFieldSet = new Set<SettingsField>(ownerSettingsFields);
const operationalFieldSet = new Set<SettingsField>(operationalSettingsFields);

type SettingsPermissionSubject = WorkspaceRole | "unknown" | Pick<WorkspaceMember, "role" | "status"> | null | undefined;

function roleFromSubject(subject: SettingsPermissionSubject) {
  if (!subject) return undefined;
  if (typeof subject === "string") return subject;
  if ((subject.status ?? "active") !== "active") return undefined;

  return subject.role;
}

export function settingSectionForField(field: SettingsField): SettingsSection {
  if (["workspace_name", "company_name", "business_type", "tax_year", "default_currency", "country_region", "timezone_display", "language"].includes(field)) {
    return "workspace_profile";
  }
  if (["company_legal_name", "dba_name", "entity_type", "ein_tax_id", "registered_state", "business_address", "contact_email", "finance_contact_name"].includes(field)) {
    return "company_information";
  }
  if (operationalFieldSet.has(field) || ["lock_closed_months", "allow_admins_reopen_months", "cpa_read_only_note"].includes(field)) {
    return "finance_operations";
  }
  if (["data_retention_policy", "receipt_retention_policy", "export_watermark_preference"].includes(field)) {
    return "data_compliance";
  }

  return "security_access";
}

export function isOperationalSettingsField(field: SettingsField) {
  return operationalFieldSet.has(field);
}

export function isOwnerSettingsField(field: SettingsField) {
  return ownerFieldSet.has(field);
}

export function canUpdateSettingsFields(
  subject: SettingsPermissionSubject,
  fields: SettingsField[]
) {
  if (!fields.length) return true;

  const role = roleFromSubject(subject);
  if (role === "owner") return true;
  if (role === "admin" || role === "bookkeeper") {
    return fields.every((field) => operationalFieldSet.has(field));
  }

  return false;
}

export function changedSettingsFields(previous: AppSettings, next: AppSettings) {
  return [...ownerSettingsFields, ...operationalSettingsFields].filter((field) => previous[field] !== next[field]);
}
