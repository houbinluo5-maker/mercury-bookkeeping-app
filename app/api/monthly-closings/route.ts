import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/server-auth";
import {
  closeSupabaseMonthlyClosing,
  isSupabaseConfigured,
  loadSupabaseMonthlyClosings,
  reopenSupabaseMonthlyClosing,
  updateSupabaseMonthlyClosingSummary
} from "@/lib/supabase-server";
import type { MonthlyClosingSummaryJson } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

class ValidationError extends Error {}

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

function badRequest(message: string) {
  return NextResponse.json(
    {
      apiStatus: 400,
      apiStatusText: "Bad Request",
      configured: true,
      error: message,
      mode: "error"
    },
    { status: 400 }
  );
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
      apiStatus: 500,
      apiStatusText: "Internal Server Error",
      configured: true,
      error: error instanceof Error ? error.message : "Monthly closing request failed.",
      mode: "error"
    },
    { status: 500 }
  );
}

function ok(body: JsonRecord) {
  return NextResponse.json({
    apiStatus: 200,
    apiStatusText: "OK",
    configured: true,
    mode: "supabase",
    ...body
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new ValidationError(`${label} must be an object.`);
  return value;
}

function readInteger(record: JsonRecord, key: string, min: number, max: number) {
  const value = Number(record[key]);

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${key} is invalid.`);
  }

  return value;
}

function readReason(record: JsonRecord, key = "reason") {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} is required.`);
  }

  if (value.trim().length > 1000) {
    throw new ValidationError(`${key} is too long.`);
  }

  return value.trim();
}

function readSummary(record: JsonRecord) {
  const summary = assertRecord(record.summary, "summary");

  return {
    audit_log_count: Number(summary.audit_log_count ?? 0),
    backup_exported: Boolean(summary.backup_exported ?? false),
    checklist: isRecord(summary.checklist) ? summary.checklist as Record<string, boolean> : {},
    closed_period_change_count: Number(summary.closed_period_change_count ?? 0),
    expenses: Number(summary.expenses ?? 0),
    missing_receipts_count: Number(summary.missing_receipts_count ?? 0),
    needs_review_count: Number(summary.needs_review_count ?? 0),
    net_income: Number(summary.net_income ?? 0),
    possible_duplicates_count: Number(summary.possible_duplicates_count ?? 0),
    revenue: Number(summary.revenue ?? 0),
    total_transactions: Number(summary.total_transactions ?? 0),
    uncategorized_count: Number(summary.uncategorized_count ?? 0),
    unreconciled_count: Number(summary.unreconciled_count ?? 0)
  } satisfies MonthlyClosingSummaryJson;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticatedRequest(request))) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const closings = await loadSupabaseMonthlyClosings();
    const exportType = request.nextUrl.searchParams.get("export");

    if (exportType === "summary") {
      const headers = [
        "year",
        "month",
        "status",
        "readiness_score",
        "close_reason",
        "reopen_reason",
        "missing_receipts_count",
        "needs_review_count",
        "uncategorized_count",
        "unreconciled_count",
        "possible_duplicates_count",
        "closed_at",
        "reopened_at",
        "related_audit_log_count"
      ];
      const rows = closings.map((closing) => [
        closing.year,
        closing.month,
        closing.status,
        closing.readiness_score,
        closing.close_reason,
        closing.reopen_reason,
        closing.summary_json.missing_receipts_count,
        closing.summary_json.needs_review_count,
        closing.summary_json.uncategorized_count,
        closing.summary_json.unreconciled_count,
        closing.summary_json.possible_duplicates_count,
        closing.closed_at ?? "",
        closing.reopened_at ?? "",
        closing.summary_json.audit_log_count ?? 0
      ]);
      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Disposition": "attachment; filename=monthly-closing-summary.csv",
          "Content-Type": "text/csv; charset=utf-8"
        }
      });
    }

    return ok({
      closings,
      message: "Monthly closings loaded."
    });
  } catch (error) {
    return supabaseError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticatedRequest(request))) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const body = assertRecord(await request.json(), "request body");
    const action = body.action;
    const year = readInteger(body, "year", 2000, 2100);
    const month = readInteger(body, "month", 1, 12);

    if (action === "close") {
      const summary = readSummary(body);
      const result = await closeSupabaseMonthlyClosing(
        year,
        month,
        readReason(body),
        Math.max(0, Math.min(100, 100 -
          summary.missing_receipts_count * 8 -
          summary.needs_review_count * 6 -
          summary.uncategorized_count * 8 -
          summary.unreconciled_count * 3 -
          summary.possible_duplicates_count * 6
        )),
        summary
      );

      return ok({
        audit_logs: result.audit_logs,
        closing: result.closing,
        message: "Month closed."
      });
    }

    if (action === "reopen") {
      const result = await reopenSupabaseMonthlyClosing(year, month, readReason(body));

      return ok({
        audit_logs: result.audit_logs,
        closing: result.closing,
        message: "Month reopened."
      });
    }

    if (action === "update_summary") {
      const result = await updateSupabaseMonthlyClosingSummary(year, month, readSummary(body));

      return ok({
        audit_logs: result.audit_logs,
        closing: result.closing,
        message: "Monthly closing summary updated."
      });
    }

    return badRequest("Unsupported monthly closing action.");
  } catch (error) {
    if (error instanceof ValidationError) return badRequest(error.message);
    return supabaseError(error);
  }
}
