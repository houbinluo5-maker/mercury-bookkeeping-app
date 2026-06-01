import { NextResponse, type NextRequest } from "next/server";
import { appendServerAuditLog } from "@/lib/audit-server";
import { setActiveWorkspaceCookie } from "@/lib/auth-cookies";
import { getAuthenticatedContext } from "@/lib/server-auth";
import { getActiveWorkspaceMembershipForUser } from "@/lib/supabase-auth-server";

function unauthorized() {
  return NextResponse.json({ error: "Authenticated account login is required." }, { status: 401 });
}

function forbidden() {
  return NextResponse.json(
    { error: "You do not have access to this workspace." },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);

  if (!auth || auth.authType !== "supabase" || !auth.user) {
    return unauthorized();
  }

  let workspaceId = "";

  try {
    const body = (await request.json()) as { workspaceId?: string };
    workspaceId = String(body.workspaceId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Workspace switch expected a JSON body." }, { status: 400 });
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace id is required." }, { status: 400 });
  }

  const access = await getActiveWorkspaceMembershipForUser(auth.user, workspaceId);

  if (!access) {
    return forbidden();
  }

  try {
    await appendServerAuditLog(auth, {
      action: "workspace_switched",
      actor: auth.user.email ?? auth.membership?.role ?? "unknown",
      details: {
        from_workspace_id: auth.workspace.id,
        result: "success",
        to_workspace_id: access.workspace.id
      },
      entity_id: access.workspace.id,
      entity_type: "workspace",
      field_name: "active_workspace",
      new_value: access.workspace.id,
      old_value: auth.workspace.id,
      reason: `Switched workspace from ${auth.workspace.id} to ${access.workspace.id}.`,
      source: "manual"
    });
  } catch {
    // Workspace switching should not fail solely because audit persistence is temporarily unavailable.
  }

  const response = NextResponse.json({
    ok: true,
    role: access.membership.role,
    workspace: access.workspace
  });

  setActiveWorkspaceCookie(response, access.workspace);

  return response;
}
