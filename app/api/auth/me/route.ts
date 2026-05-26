import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedContext(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    authType: context.authType,
    user: context.user
      ? {
          email: context.user.email ?? "",
          id: context.user.id,
          name: context.user.user_metadata?.full_name || context.user.user_metadata?.name || "",
          avatarUrl: context.user.user_metadata?.avatar_url || ""
        }
      : null,
    workspace: context.workspace,
    role: context.membership?.role ?? "owner"
  });
}
