import {
  buildExportAuditEntry,
  type ExportAuditDetails,
  type ExportAuditResult
} from "@/lib/export-audit";
import { auditActorContext } from "@/lib/audit-server";
import { appendSupabaseAuditLogs, isSupabaseConfigured } from "@/lib/supabase-server";
import type { AuthWorkspaceContext } from "@/lib/supabase-auth-server";
import type { AuditLog } from "@/lib/types";

export async function logExportAudit(
  auth: AuthWorkspaceContext,
  details: ExportAuditDetails,
  result: ExportAuditResult
): Promise<AuditLog | null> {
  const actor = auditActorContext(auth);
  const auditLog = buildExportAuditEntry(details, result, {
    actorEmail: actor.actorEmail,
    actorRole: actor.actorRole,
    actorUserId: actor.actorUserId,
    workspaceId: actor.workspaceId
  });

  if (!isSupabaseConfigured()) return auditLog;

  try {
    await appendSupabaseAuditLogs([auditLog], auth.workspace.id);
    return auditLog;
  } catch {
    return null;
  }
}
