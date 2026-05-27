import { NextResponse, type NextRequest } from "next/server";
import { permissionsForRole } from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  getLegacyWorkspaceClaimStatus,
  normalizeIdentityEmail
} from "@/lib/supabase-auth-server";

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const legacyWorkspaceClaim = context.user
    ? await getLegacyWorkspaceClaimStatus(context.user).catch(() => null)
    : null;
  const normalizedEmail = normalizeIdentityEmail(context.user?.email);
  const authProvider =
    context.user?.user_metadata?.provider ||
    context.user?.app_metadata?.provider ||
    (context.authType === "legacy" ? "legacy" : "email");
  const ownsWorkspace = Boolean(
    context.user &&
      (context.workspace.owner_user_id === context.user.id || context.membership?.role === "owner")
  );

  return NextResponse.json({
    authType: context.authType,
    authProvider,
    legacyWorkspaceClaim,
    normalizedEmail,
    ownsWorkspace,
    user: context.user
      ? {
          email: context.user.email ?? "",
          id: context.user.id,
          name: context.user.user_metadata?.full_name || context.user.user_metadata?.name || "",
          avatarUrl: context.user.user_metadata?.avatar_url || ""
        }
      : null,
    workspace: context.workspace,
    permissions: permissionsForRole(context.membership),
    role: context.membership?.role ?? "owner"
  });
}
