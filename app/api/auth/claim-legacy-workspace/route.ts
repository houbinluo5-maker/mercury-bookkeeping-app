import { NextResponse, type NextRequest } from "next/server";
import { setActiveWorkspaceCookie } from "@/lib/auth-cookies";
import { getAuthenticatedContext } from "@/lib/server-auth";
import { claimLegacyWorkspace } from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedContext(request);

  if (!context || context.authType !== "supabase" || !context.user) {
    return NextResponse.json({ error: "Authenticated account login is required." }, { status: 401 });
  }

  try {
    const result = await claimLegacyWorkspace(context.user);
    const response = NextResponse.json({
      auditLog: result.auditLog,
      legacyWorkspaceClaim: result.status,
      membership: result.membership,
      ok: true,
      workspace: result.workspace
    });

    setActiveWorkspaceCookie(response, result.workspace);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Legacy workspace claim failed." },
      { status: 400 }
    );
  }
}
