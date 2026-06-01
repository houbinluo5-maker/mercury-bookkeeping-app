import { NextResponse, type NextRequest } from "next/server";
import { buildSettingsAuditLogs } from "@/lib/audit";
import { appendServerAuditLog, auditActorContext } from "@/lib/audit-server";
import {
  canUpdateSettingsFields,
  changedSettingsFields,
  type SettingsField
} from "@/lib/settings-permissions";
import { defaultSettings } from "@/lib/seed-data";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  isSupabaseConfigured,
  loadSupabaseSettings,
  updateSupabaseSettings
} from "@/lib/supabase-server";
import type { AppSettings } from "@/lib/types";

const settingsPermissionError = "You do not have permission to update workspace settings.";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function supabaseNotConfigured(settings: AppSettings) {
  return NextResponse.json({
    apiStatus: 200,
    apiStatusText: "OK",
    configured: false,
    message: "Supabase variables are not configured.",
    mode: "local",
    settings
  });
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
      apiStatus: 500,
      apiStatusText: "Internal Server Error",
      configured: true,
      error: error instanceof Error ? error.message : "Settings update failed.",
      mode: "error"
    },
    { status: 500 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    ...defaultSettings,
    ...settings
  };
}

async function forbidden(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>,
  fields: SettingsField[]
) {
  await appendServerAuditLog(auth, {
    action: "permission_denied",
    actor: "system",
    details: {
      attempted_fields: fields,
      actor_role: auth.membership?.role ?? "unknown",
      result: "denied",
      section: "workspace_settings"
    },
    entity_id: auth.workspace.id,
    entity_type: "settings",
    field_name: "workspace_settings",
    new_value: settingsPermissionError,
    old_value: "",
    reason: settingsPermissionError,
    source: "manual"
  });

  return NextResponse.json({ error: settingsPermissionError }, { status: 403 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Settings API expected a JSON body." }, { status: 400 });
  }

  if (!isRecord(body) || !isRecord(body.settings)) {
    return NextResponse.json({ error: "Settings API expected a settings object." }, { status: 400 });
  }

  const previous = isSupabaseConfigured()
    ? await loadSupabaseSettings(auth.workspace.id).catch(() => defaultSettings)
    : defaultSettings;
  const next = normalizeSettings({
    ...previous,
    ...(body.settings as Partial<AppSettings>)
  });
  const changedFields = changedSettingsFields(previous, next);

  if (!canUpdateSettingsFields(auth.membership, changedFields)) {
    return forbidden(auth, changedFields);
  }

  if (!isSupabaseConfigured()) return supabaseNotConfigured(next);

  try {
    const actor = auditActorContext(auth);
    const auditLogs = buildSettingsAuditLogs(previous, next, {
      actor: actor.actorEmail || actor.actorRole,
      actorEmail: actor.actorEmail,
      actorRole: actor.actorRole,
      actorUserId: actor.actorUserId,
      workspaceId: actor.workspaceId
    });
    const result = await updateSupabaseSettings(next, auditLogs, auth.workspace.id);

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      audit_logs: result.audit_logs,
      configured: true,
      message: "Workspace settings updated.",
      mode: "supabase",
      settings: result.settings
    });
  } catch (error) {
    return supabaseError(error);
  }
}
