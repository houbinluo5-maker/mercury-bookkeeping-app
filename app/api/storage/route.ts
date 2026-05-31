import { NextResponse, type NextRequest } from "next/server";
import {
  canExportLedgerData,
  exportPermissionDeniedMessage,
  type ExportAuditDetails
} from "@/lib/export-audit";
import { logExportAudit } from "@/lib/export-audit-server";
import { logPermissionDenied } from "@/lib/permission-audit-server";
import { canManageWorkspace, permissionDeniedMessage } from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  isSupabaseConfigured,
  loadSupabaseBackup
} from "@/lib/supabase-server";

const fullSupabaseBackupWriteDisabledMessage =
  "Full Supabase backup writes are disabled in Supabase mode. Use server ledger APIs for transaction writes.";

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
    await logPermissionDenied(auth, "storage.full_backup_write", "workspace", auth.workspace.id);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

function supabaseNotConfigured() {
  return NextResponse.json(
    {
      apiStatus: 200,
      apiStatusText: "OK",
      configured: false,
      mode: "local",
      message: "Supabase variables are not configured."
    },
    { status: 200 }
  );
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
      apiStatus: 500,
      apiStatusText: "Internal Server Error",
      configured: true,
      error: error instanceof Error ? error.message : "Supabase request failed.",
      mode: "error"
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const backupExport = request.nextUrl.searchParams.get("export") === "backup";
    const auditDetails = {
      entityId: auth.workspace.id,
      entityType: "workspace",
      exportType: "workspace_backup"
    } satisfies ExportAuditDetails;

    if (backupExport && !canExportLedgerData(auth.membership, auditDetails.exportType)) {
      await logExportAudit(auth, auditDetails, "denied");

      return NextResponse.json({ error: exportPermissionDeniedMessage }, { status: 403 });
    }

    const data = await loadSupabaseBackup(auth.workspace.id);

    if (backupExport) {
      await logExportAudit(auth, auditDetails, "success");
    }

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      configured: true,
      data,
      mode: "supabase",
      message: "Supabase connected."
    });
  } catch (error) {
    return supabaseError(error);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!canManageWorkspace(auth.membership)) return forbidden(auth);
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  return NextResponse.json(
    {
      apiStatus: 409,
      apiStatusText: "Conflict",
      configured: true,
      error: fullSupabaseBackupWriteDisabledMessage,
      mode: "supabase",
      message: fullSupabaseBackupWriteDisabledMessage
    },
    { status: 409 }
  );
}
