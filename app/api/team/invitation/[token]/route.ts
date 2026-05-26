import { NextResponse, type NextRequest } from "next/server";
import { setActiveWorkspaceCookie } from "@/lib/auth-cookies";
import { getAuthenticatedContext } from "@/lib/server-auth";
import { acceptInvitation, getInvitationForToken } from "@/lib/team-server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const result = await getInvitationForToken(token);

    if (!result) {
      return NextResponse.json({ error: "Invitation was not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invitation lookup failed." },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getAuthenticatedContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Sign in to accept this invitation." }, { status: 401 });
  }

  try {
    const { token } = await context.params;
    const result = await acceptInvitation(token, auth);
    const response = NextResponse.json({ ok: true, ...result });

    if (result.workspace) {
      setActiveWorkspaceCookie(response, result.workspace);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invitation acceptance failed." },
      { status: 400 }
    );
  }
}
