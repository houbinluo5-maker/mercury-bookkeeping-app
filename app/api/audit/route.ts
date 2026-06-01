import { NextResponse, type NextRequest } from "next/server";
import { filterAuditLogsForRole, normalizeAuditLogs } from "@/lib/audit";
import { auditActorContext } from "@/lib/audit-server";
import { logPermissionDenied } from "@/lib/permission-audit-server";
import { canEditTransactions, canViewAuditTrail, permissionDeniedMessage } from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  appendSupabaseAuditLogs,
  isSupabaseConfigured,
  loadSupabaseAuditLogs
} from "@/lib/supabase-server";
import type { AuditLog } from "@/lib/types";

function unauthorized() {
  return NextResponse.json(
    {
      apiStatus: 401,
      apiStatusText: "Unauthorized",
      configured: false,
      error: "Unauthorized",
      mode: "error"
    },
    { status: 401 }
  );
}

async function forbidden(auth: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (auth) {
    await logPermissionDenied(auth, "audit.append", "workspace", auth.workspace.id);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

function supabaseNotConfigured() {
  return NextResponse.json(
    {
      apiStatus: 200,
      apiStatusText: "OK",
      configured: false,
      data: [],
      mode: "local",
      message: "Supabase variables are not configured."
    },
    { status: 200 }
  );
}

async function viewForbidden(auth: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (auth) {
    await logPermissionDenied(auth, "audit.view", "workspace", auth.workspace.id);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
      apiStatus: 500,
      apiStatusText: "Internal Server Error",
      configured: true,
      error: error instanceof Error ? error.message : "Supabase audit request failed.",
      mode: "error"
    },
    { status: 500 }
  );
}

function readBoundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const next = Number(value ?? fallback);

  if (!Number.isFinite(next)) return fallback;

  return Math.max(min, Math.min(max, Math.floor(next)));
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!canViewAuditTrail(auth.membership)) return viewForbidden(auth);
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const limit = readBoundedInteger(request.nextUrl.searchParams.get("limit"), 100, 1, 500);
    const offset = readBoundedInteger(request.nextUrl.searchParams.get("offset"), 0, 0, 100_000);
    const data = filterAuditLogsForRole(
      await loadSupabaseAuditLogs(auth.workspace.id, { limit, offset }),
      auth.membership?.role ?? "unknown"
    );

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      configured: true,
      data,
      limit,
      mode: "supabase",
      message: "Audit trail loaded.",
      offset,
      returned: data.length
    });
  } catch (error) {
    return supabaseError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!canEditTransactions(auth.membership)) return forbidden(auth);
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    let entries: AuditLog[] = [];

    try {
      const body = (await request.json()) as { entries?: AuditLog[] };
      const actor = auditActorContext(auth);
      entries = normalizeAuditLogs(body.entries).map((entry) => ({
        ...entry,
        actor_email: actor.actorEmail || entry.actor_email,
        actor_role: actor.actorRole,
        actor_user_id: actor.actorUserId || entry.actor_user_id,
        workspace_id: actor.workspaceId
      }));
    } catch {
      return NextResponse.json(
        {
          apiStatus: 400,
          apiStatusText: "Bad Request",
          configured: true,
          error: "Audit API expected a JSON body with an entries array.",
          mode: "error"
        },
        { status: 400 }
      );
    }

    const data = await appendSupabaseAuditLogs(entries, auth.workspace.id);

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      configured: true,
      data,
      mode: "supabase",
      message: "Audit trail synced."
    });
  } catch (error) {
    return supabaseError(error);
  }
}
