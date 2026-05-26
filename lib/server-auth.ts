import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SUPABASE_ACCESS_TOKEN_COOKIE,
  getExpectedAuthToken,
  isAdminPasswordConfigured
} from "@/lib/auth";
import {
  getUserFromAccessToken,
  getWorkspaceContextForUser,
  legacyWorkspaceContext,
  type AuthWorkspaceContext
} from "@/lib/supabase-auth-server";

export async function getAuthenticatedContext(request: NextRequest): Promise<AuthWorkspaceContext | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseToken = bearer || request.cookies.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;

  if (supabaseToken) {
    try {
      const user = await getUserFromAccessToken(supabaseToken);
      return getWorkspaceContextForUser(user);
    } catch {
      return null;
    }
  }

  if (!isAdminPasswordConfigured()) return null;

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedAuthToken();

  if (sessionToken && expectedToken && sessionToken === expectedToken) {
    return legacyWorkspaceContext();
  }

  return null;
}

export async function isAuthenticatedRequest(request: NextRequest) {
  return Boolean(await getAuthenticatedContext(request));
}
