import { NextResponse, type NextRequest } from "next/server";
import { normalizeAuditLogs } from "@/lib/audit";
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

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const data = await loadSupabaseAuditLogs(auth.workspace.id);

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      configured: true,
      data,
      mode: "supabase",
      message: "Audit trail loaded."
    });
  } catch (error) {
    return supabaseError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    let entries: AuditLog[] = [];

    try {
      const body = (await request.json()) as { entries?: AuditLog[] };
      entries = normalizeAuditLogs(body.entries);
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
