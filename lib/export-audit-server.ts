import {
  buildExportAuditEntry,
  type ExportAuditDetails,
  type ExportAuditResult
} from "@/lib/export-audit";
import { appendSupabaseAuditLogs, isSupabaseConfigured } from "@/lib/supabase-server";
import {
  normalizeIdentityEmail,
  type AuthWorkspaceContext
} from "@/lib/supabase-auth-server";
import type { AuditLog } from "@/lib/types";

export async function logExportAudit(
  auth: AuthWorkspaceContext,
  details: ExportAuditDetails,
  result: ExportAuditResult
): Promise<AuditLog | null> {
  const actorEmail = normalizeIdentityEmail(auth.user?.email);
  const auditLog = buildExportAuditEntry(details, result, {
    actorEmail,
    actorRole: auth.membership?.role ?? "unknown",
    actorUserId: auth.user?.id,
    workspaceId: auth.workspace.id
  });

  if (!isSupabaseConfigured()) return auditLog;

  try {
    await appendSupabaseAuditLogs([auditLog], auth.workspace.id);
    return auditLog;
  } catch {
    return null;
  }
}
