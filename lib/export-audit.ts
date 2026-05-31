import { createAuditEntry } from "@/lib/audit";
import {
  canExportFullBackup,
  canExportReceipts,
  canExportReports,
  canExportTaxPackage,
  canExportTransactions,
  canExportWorkspaceArchive,
  type PermissionSubject
} from "@/lib/permissions";
import type { AuditAction, AuditEntityType, AuditLog, WorkspaceRole } from "@/lib/types";

export const exportPermissionDeniedMessage =
  "You do not have permission to export this data.";

export const ledgerExportTypes = [
  "annual_tax_summary",
  "audit_log",
  "closed_period_changes",
  "dashboard_report",
  "monthly_closing_checklist",
  "monthly_closing_summary",
  "monthly_report",
  "quarterly_report",
  "receipt_export",
  "reconciliation_report",
  "tax_package_csv",
  "tax_package_workbook",
  "transaction_csv",
  "workspace_archive",
  "workspace_backup"
] as const;

export type LedgerExportType = (typeof ledgerExportTypes)[number];
export type ExportAuditResult = "success" | "denied";

export type ExportAuditDetails = {
  entityId?: string;
  entityType?: AuditEntityType;
  exportType: LedgerExportType;
  fileName?: string;
  reportPeriod?: string;
};

export type ExportActorContext = {
  actorEmail?: string;
  actorRole?: WorkspaceRole | "unknown";
  actorUserId?: string;
  workspaceId?: string;
};

export function parseLedgerExportType(value: unknown): LedgerExportType | null {
  return ledgerExportTypes.includes(value as LedgerExportType)
    ? (value as LedgerExportType)
    : null;
}

export function canExportLedgerData(
  subject: PermissionSubject,
  exportType: LedgerExportType
) {
  if (
    exportType === "annual_tax_summary" ||
    exportType === "audit_log" ||
    exportType === "closed_period_changes" ||
    exportType === "dashboard_report" ||
    exportType === "monthly_closing_checklist" ||
    exportType === "monthly_closing_summary" ||
    exportType === "monthly_report" ||
    exportType === "quarterly_report" ||
    exportType === "reconciliation_report"
  ) {
    return canExportReports(subject);
  }

  if (exportType === "tax_package_csv" || exportType === "tax_package_workbook") {
    return canExportTaxPackage(subject);
  }

  if (exportType === "transaction_csv") {
    return canExportTransactions(subject);
  }

  if (exportType === "receipt_export") {
    return canExportReceipts(subject);
  }

  if (exportType === "workspace_archive") {
    return canExportWorkspaceArchive(subject);
  }

  return canExportFullBackup(subject);
}

export function auditActionForExport(
  exportType: LedgerExportType,
  result: ExportAuditResult
): AuditAction {
  if (result === "denied") return "export_denied";
  if (exportType === "receipt_export") return "receipts_exported";
  if (exportType === "transaction_csv") return "transactions_exported";
  if (exportType === "workspace_archive" || exportType === "workspace_backup") {
    return "workspace_backup_exported";
  }
  if (exportType === "tax_package_csv" || exportType === "tax_package_workbook") {
    return "tax_package_exported";
  }

  return "report_exported";
}

export function defaultEntityTypeForExport(exportType: LedgerExportType): AuditEntityType {
  if (exportType === "receipt_export") return "receipt";
  if (exportType === "workspace_archive" || exportType === "workspace_backup") return "workspace";
  if (
    exportType === "monthly_closing_checklist" ||
    exportType === "monthly_closing_summary" ||
    exportType === "reconciliation_report"
  ) {
    return "reconciliation";
  }

  return "transaction";
}

export function buildExportAuditEntry(
  details: ExportAuditDetails,
  result: ExportAuditResult,
  actor: ExportActorContext = {}
): AuditLog {
  const actorRole = actor.actorRole ?? "unknown";
  const entityType = details.entityType ?? defaultEntityTypeForExport(details.exportType);
  const metadata = {
    actor_email: actor.actorEmail ?? "",
    actor_role: actorRole,
    entity_type: entityType,
    export_type: details.exportType,
    file_name: details.fileName ?? "",
    report_period: details.reportPeriod ?? "",
    result,
    workspace_id: actor.workspaceId ?? ""
  };

  return createAuditEntry({
    action: auditActionForExport(details.exportType, result),
    actor: actor.actorEmail || actorRole || "unknown",
    actor_email: actor.actorEmail,
    actor_user_id: actor.actorUserId,
    entity_id: details.entityId || actor.workspaceId || details.reportPeriod || details.exportType,
    entity_type: entityType,
    field_name: details.exportType,
    new_value: JSON.stringify(metadata),
    old_value: actorRole,
    reason:
      result === "success"
        ? `Export completed: ${details.exportType}.`
        : `Export denied: ${details.exportType}.`,
    source: "manual",
    workspace_id: actor.workspaceId
  });
}
