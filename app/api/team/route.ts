import { NextResponse, type NextRequest } from "next/server";
import { logPermissionDenied } from "@/lib/permission-audit-server";
import { PermissionError, permissionDeniedMessage } from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import {
  changeTeamMemberRole,
  createTeamInvitation,
  listTeam,
  removeTeamMember,
  revokeTeamInvitation
} from "@/lib/team-server";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Team request failed." },
    { status: 400 }
  );
}

async function forbidden(
  auth: Awaited<ReturnType<typeof getAuthenticatedContext>>,
  attemptedAction: string
) {
  if (auth) {
    await logPermissionDenied(auth, attemptedAction, "workspace", auth.workspace.id);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();

  try {
    return NextResponse.json(await listTeam(auth, request.nextUrl.origin));
  } catch (error) {
    return badRequest(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  let attemptedAction = "unknown";

  try {
    const body = (await request.json()) as {
      action?: string;
      email?: string;
      invitationId?: string;
      memberId?: string;
      role?: string;
    };
    attemptedAction = body.action || "unknown";

    if (body.action === "invite") {
      return NextResponse.json(
        await createTeamInvitation(auth, String(body.email ?? ""), String(body.role ?? ""), request.nextUrl.origin)
      );
    }

    if (body.action === "revoke_invitation") {
      return NextResponse.json(await revokeTeamInvitation(auth, String(body.invitationId ?? "")));
    }

    if (body.action === "remove_member") {
      return NextResponse.json(await removeTeamMember(auth, String(body.memberId ?? "")));
    }

    if (body.action === "change_role") {
      return NextResponse.json(await changeTeamMemberRole(auth, String(body.memberId ?? ""), String(body.role ?? "")));
    }

    return NextResponse.json({ error: "Unsupported team action." }, { status: 400 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return forbidden(auth, `team.${attemptedAction}`);
    }

    return badRequest(error);
  }
}
