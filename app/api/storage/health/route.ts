import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticatedRequest } from "@/lib/server-auth";
import { checkSupabaseHealth } from "@/lib/supabase-server";

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

export async function GET(request: NextRequest) {
  if (!(await isAuthenticatedRequest(request))) return unauthorized();

  const health = await checkSupabaseHealth();

  return NextResponse.json({
    apiStatus: 200,
    apiStatusText: "OK",
    configured: health.supabase_url === "ok" && health.service_role_key === "ok",
    data: health,
    error: health.error || undefined,
    mode: health.connected ? "supabase" : "local",
    message: health.connected ? "Supabase connected." : health.error || "Supabase is not connected."
  });
}
