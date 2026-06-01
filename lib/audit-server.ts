import { createAuditEntry, sanitizeAuditDetails } from "@/lib/audit";
import { appendSupabaseAuditLogs, isSupabaseConfigured } from "@/lib/supabase-server";
import {
  normalizeIdentityEmail,
  type AuthWorkspaceContext
} from "@/lib/supabase-auth-server";
import type { AuditLog } from "@/lib/types";
import type { WorkspaceRole } from "@/lib/types";

export function auditActorContext(auth: AuthWorkspaceContext): {
  actorEmail?: string;
  actorRole: WorkspaceRole | "unknown";
  actorUserId?: string;
  workspaceId: string;
} {
  const actorEmail = normalizeIdentityEmail(auth.user?.email);

  return {
    actorEmail: actorEmail || undefined,
    actorRole: auth.membership?.role ?? "unknown",
    actorUserId: auth.user?.id,
    workspaceId: auth.workspace.id
  };
}

export function withServerAuditContext(
  auth: AuthWorkspaceContext,
  input: Omit<AuditLog, "created_at" | "id"> & { created_at?: string; id?: string }
) {
  const actor = auditActorContext(auth);

  return createAuditEntry({
    ...input,
    actor: actor.actorEmail || input.actor || actor.actorRole,
    actor_email: actor.actorEmail || input.actor_email,
    actor_role: actor.actorRole,
    actor_user_id: actor.actorUserId || input.actor_user_id,
    details: sanitizeAuditDetails(input.details),
    workspace_id: actor.workspaceId
  });
}

export async function appendServerAuditLog(
  auth: AuthWorkspaceContext,
  input: Omit<AuditLog, "created_at" | "id"> & { created_at?: string; id?: string }
) {
  const auditLog = withServerAuditContext(auth, input);

  if (!isSupabaseConfigured()) return auditLog;

  await appendSupabaseAuditLogs([auditLog], auth.workspace.id);

  return auditLog;
}
