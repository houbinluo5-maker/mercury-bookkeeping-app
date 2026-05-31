import { NextResponse, type NextRequest } from "next/server";
import { auditEntityTypes } from "@/lib/audit";
import {
  canExportLedgerData,
  exportPermissionDeniedMessage,
  parseLedgerExportType,
  type ExportAuditDetails
} from "@/lib/export-audit";
import { logExportAudit } from "@/lib/export-audit-server";
import { getAuthenticatedContext } from "@/lib/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import type { AuditEntityType } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(record: JsonRecord, key: string, maxLength = 160) {
  const value = record[key];

  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readEntityType(record: JsonRecord) {
  const value = record.entityType;

  return auditEntityTypes.includes(value as AuditEntityType)
    ? (value as AuditEntityType)
    : undefined;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: JsonRecord;

  try {
    const parsed = await request.json();
    if (!isRecord(parsed)) throw new Error("Invalid body.");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Export audit request is invalid." }, { status: 400 });
  }

  const exportType = parseLedgerExportType(body.exportType);

  if (!exportType) {
    return NextResponse.json({ error: "Export type is invalid." }, { status: 400 });
  }

  const details: ExportAuditDetails = {
    entityId: readText(body, "entityId"),
    entityType: readEntityType(body),
    exportType,
    fileName: readText(body, "fileName", 240),
    reportPeriod: readText(body, "reportPeriod")
  };
  const allowed = canExportLedgerData(auth.membership, exportType);
  const auditLog = await logExportAudit(auth, details, allowed ? "success" : "denied");

  if (!allowed) {
    return NextResponse.json(
      {
        audit_log: auditLog,
        configured: isSupabaseConfigured(),
        error: exportPermissionDeniedMessage
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    audit_log: auditLog,
    configured: isSupabaseConfigured(),
    ok: true
  });
}
