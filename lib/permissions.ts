import type { WorkspaceMember, WorkspaceMemberStatus, WorkspaceRole } from "@/lib/types";

export const permissionDeniedMessage = "You do not have permission to perform this action.";

export type PermissionSubject =
  | WorkspaceRole
  | Pick<WorkspaceMember, "role" | "status">
  | null
  | undefined;

export type WorkspacePermissions = {
  canCloseMonth: boolean;
  canDeleteReceipts: boolean;
  canDeleteTransactions: boolean;
  canExportFullBackup: boolean;
  canExportReceipts: boolean;
  canEditTransactions: boolean;
  canExportReports: boolean;
  canExportTaxPackage: boolean;
  canExportTransactions: boolean;
  canExportWorkspaceArchive: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canManageWorkspace: boolean;
  canReopenMonth: boolean;
  canRunReconciliation: boolean;
  canUploadReceipts: boolean;
  canViewAuditTrail: boolean;
  canViewReports: boolean;
  canViewTaxPackage: boolean;
  canViewTeam: boolean;
};

export class PermissionError extends Error {
  constructor(message = permissionDeniedMessage) {
    super(message);
    this.name = "PermissionError";
  }
}

function subjectRole(subject: PermissionSubject) {
  return typeof subject === "string" ? subject : subject?.role;
}

function subjectStatus(subject: PermissionSubject, fallbackStatus?: WorkspaceMemberStatus) {
  return typeof subject === "string" ? fallbackStatus : subject?.status ?? fallbackStatus;
}

function activeRole(subject: PermissionSubject, fallbackStatus?: WorkspaceMemberStatus) {
  const role = subjectRole(subject);
  const status = subjectStatus(subject, fallbackStatus) ?? "active";

  return status === "active" ? role : undefined;
}

export function permissionsForRole(
  subject: PermissionSubject,
  fallbackStatus?: WorkspaceMemberStatus
): WorkspacePermissions {
  const role = activeRole(subject, fallbackStatus);
  const owner = role === "owner";
  const admin = role === "admin";
  const bookkeeper = role === "bookkeeper";
  const operational = owner || admin || bookkeeper;
  const viewOnly = role === "viewer" || role === "cpa";
  const active = operational || viewOnly;
  const canExportOperational = owner || admin || bookkeeper || role === "cpa";

  return {
    canCloseMonth: operational,
    canDeleteReceipts: operational,
    canDeleteTransactions: operational,
    canEditTransactions: operational,
    canExportFullBackup: owner,
    canExportReceipts: canExportOperational,
    canExportReports: canExportOperational,
    canExportTaxPackage: owner || admin || role === "cpa",
    canExportTransactions: canExportOperational,
    canExportWorkspaceArchive: owner,
    canInviteMembers: owner || admin,
    canManageMembers: owner,
    canManageSettings: owner,
    canManageWorkspace: owner,
    canReopenMonth: operational,
    canRunReconciliation: operational,
    canUploadReceipts: operational,
    canViewAuditTrail: active,
    canViewReports: active,
    canViewTaxPackage: active,
    canViewTeam: active
  };
}

export function canManageWorkspace(subject: PermissionSubject) {
  return permissionsForRole(subject).canManageWorkspace;
}

export function canManageMembers(subject: PermissionSubject) {
  return permissionsForRole(subject).canManageMembers;
}

export function canManageSettings(subject: PermissionSubject) {
  return permissionsForRole(subject).canManageSettings;
}

export function canEditTransactions(subject: PermissionSubject) {
  return permissionsForRole(subject).canEditTransactions;
}

export function canDeleteTransactions(subject: PermissionSubject) {
  return permissionsForRole(subject).canDeleteTransactions;
}

export function canUploadReceipts(subject: PermissionSubject) {
  return permissionsForRole(subject).canUploadReceipts;
}

export function canDeleteReceipts(subject: PermissionSubject) {
  return permissionsForRole(subject).canDeleteReceipts;
}

export function canRunReconciliation(subject: PermissionSubject) {
  return permissionsForRole(subject).canRunReconciliation;
}

export function canCloseMonth(subject: PermissionSubject) {
  return permissionsForRole(subject).canCloseMonth;
}

export function canReopenMonth(subject: PermissionSubject) {
  return permissionsForRole(subject).canReopenMonth;
}

export function canViewReports(subject: PermissionSubject) {
  return permissionsForRole(subject).canViewReports;
}

export function canExportReports(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportReports;
}

export function canViewTaxPackage(subject: PermissionSubject) {
  return permissionsForRole(subject).canViewTaxPackage;
}

export function canExportTaxPackage(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportTaxPackage;
}

export function canExportTransactions(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportTransactions;
}

export function canExportReceipts(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportReceipts;
}

export function canExportFullBackup(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportFullBackup;
}

export function canExportWorkspaceArchive(subject: PermissionSubject) {
  return permissionsForRole(subject).canExportWorkspaceArchive;
}

export function canViewAuditTrail(subject: PermissionSubject) {
  return permissionsForRole(subject).canViewAuditTrail;
}

export function canViewTeam(subject: PermissionSubject) {
  return permissionsForRole(subject).canViewTeam;
}

export function canInviteMembers(subject: PermissionSubject) {
  return permissionsForRole(subject).canInviteMembers;
}

export function canInviteRole(subject: PermissionSubject, role: "admin" | "viewer" | "cpa") {
  const currentRole = activeRole(subject);

  if (currentRole === "owner") return true;
  if (currentRole === "admin") return role === "viewer" || role === "cpa";

  return false;
}

export function requirePermission(allowed: boolean) {
  if (!allowed) throw new PermissionError();
}
