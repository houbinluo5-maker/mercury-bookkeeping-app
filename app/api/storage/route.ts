import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/server-auth";
import {
  isSupabaseConfigured,
  loadSupabaseBackup,
  replaceSupabaseBackup
} from "@/lib/supabase-server";
import type { LocalBackup } from "@/lib/types";

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
  if (!(await isAuthenticatedRequest(request))) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const data = await loadSupabaseBackup();

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
  if (!(await isAuthenticatedRequest(request))) return unauthorized();
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    let backup: LocalBackup;

    try {
      backup = (await request.json()) as LocalBackup;
    } catch {
      return NextResponse.json(
        {
          apiStatus: 400,
          apiStatusText: "Bad Request",
          configured: true,
          error: "Storage API expected a JSON backup payload.",
          mode: "error"
        },
        { status: 400 }
      );
    }

    const data = await replaceSupabaseBackup(backup);

    return NextResponse.json({
      apiStatus: 200,
      apiStatusText: "OK",
      configured: true,
      data,
      mode: "supabase",
      message: "Supabase synced."
    });
  } catch (error) {
    return supabaseError(error);
  }
}
