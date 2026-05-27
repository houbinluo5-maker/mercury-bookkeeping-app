import { createAuditEntry } from "@/lib/audit";
import { appendSupabaseAuditLogs, isSupabaseConfigured } from "@/lib/supabase-server";
import {
  normalizeIdentityEmail,
  type AuthWorkspaceContext
} from "@/lib/supabase-auth-server";
import type { AuditEntityType } from "@/lib/types";

export async function logPermissionDenied(
  auth: AuthWorkspaceContext,
  attemptedAction: string,
  entityType: AuditEntityType,
  entityId = ""
) {
  if (!isSupabaseConfigured()) return;

  const actorEmail = normalizeIdentityEmail(auth.user?.email);
  const role = auth.membership?.role ?? "unknown";

  try {
    await appendSupabaseAuditLogs(
      [
        createAuditEntry({
          action: "permission_denied",
          actor: actorEmail || "admin",
          actor_email: actorEmail,
          actor_user_id: auth.user?.id,
          entity_id: entityId,
          entity_type: entityType,
          field_name: "permission",
          new_value: attemptedAction,
          old_value: role,
          reason: `Permission denied for ${attemptedAction}.`,
          source: "manual",
          workspace_id: auth.workspace.id
        })
      ],
      auth.workspace.id
    );
  } catch {
    // Permission denial should still return 403 even if audit persistence is unavailable.
  }
}
