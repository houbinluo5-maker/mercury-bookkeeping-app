import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/server-auth";
import {
  isSupabaseConfigured,
  loadSupabaseBackup,
  replaceSupabaseBackup
} from "@/lib/supabase-server";
import type { LocalBackup } from "@/lib/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function supabaseNotConfigured() {
  return NextResponse.json({
    configured: false,
    mode: "local",
    message: "Supabase variables are not configured."
  });
}

function supabaseError(error: unknown) {
  return NextResponse.json(
    {
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
    const backup = (await request.json()) as LocalBackup;
    const data = await replaceSupabaseBackup(backup);

    return NextResponse.json({
      configured: true,
      data,
      mode: "supabase",
      message: "Supabase synced."
    });
  } catch (error) {
    return supabaseError(error);
  }
}
