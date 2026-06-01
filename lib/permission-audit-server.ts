import { appendServerAuditLog } from "@/lib/audit-server";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import type { AuthWorkspaceContext } from "@/lib/supabase-auth-server";
import type { AuditEntityType } from "@/lib/types";

export async function logPermissionDenied(
  auth: AuthWorkspaceContext,
  attemptedAction: string,
  entityType: AuditEntityType,
  entityId = ""
) {
  if (!isSupabaseConfigured()) return;

  const role = auth.membership?.role ?? "unknown";

  try {
    await appendServerAuditLog(auth, {
      action: "permission_denied",
      actor: role,
      details: {
        actor_role: role,
        attempted_action: attemptedAction,
        result: "denied"
      },
      entity_id: entityId,
      entity_type: entityType,
      field_name: "permission",
      new_value: attemptedAction,
      old_value: role,
      reason: `Permission denied for ${attemptedAction}.`,
      source: "manual"
    });
  } catch {
    // Permission denial should still return 403 even if audit persistence is unavailable.
  }
}
