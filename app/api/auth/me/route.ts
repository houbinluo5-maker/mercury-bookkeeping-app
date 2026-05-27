import { NextResponse, type NextRequest } from "next/server";
import { permissionsForRole } from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  getLegacyWorkspaceClaimStatus,
  listActiveWorkspaceMembershipsForUser,
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
  const workspaceMemberships = context.user
    ? await listActiveWorkspaceMembershipsForUser(context.user).catch(() => [])
    : [];
  const workspaceOptions = workspaceMemberships.map(({ membership, workspace }) => ({
    business_type: workspace.business_type,
    default_currency: workspace.default_currency,
    id: workspace.id,
    is_active: workspace.id === context.workspace.id,
    membership_id: membership.id,
    name: workspace.name,
    role: membership.role,
    status: membership.status ?? "active",
    tax_year: workspace.tax_year
  }));
  const hasCurrentWorkspaceOption = workspaceOptions.some((workspace) => workspace.id === context.workspace.id);
  const safeWorkspaceOptions = (
    hasCurrentWorkspaceOption
      ? workspaceOptions
      : [
          {
            business_type: context.workspace.business_type,
            default_currency: context.workspace.default_currency,
            id: context.workspace.id,
            is_active: true,
            membership_id: context.membership?.id ?? "legacy-admin-member",
            name: context.workspace.name,
            role: context.membership?.role ?? "owner",
            status: context.membership?.status ?? "active",
            tax_year: context.workspace.tax_year
          },
          ...workspaceOptions
        ]
  ).sort((left, right) => {
    if (left.is_active) return -1;
    if (right.is_active) return 1;
    return left.name.localeCompare(right.name);
  });
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
    workspaces: safeWorkspaceOptions,
    permissions: permissionsForRole(context.membership),
    role: context.membership?.role ?? "owner"
  });
}
