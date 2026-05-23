import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedAuthToken, isAdminPasswordConfigured } from "@/lib/auth";

export async function isAuthenticatedRequest(request: NextRequest) {
  if (!isAdminPasswordConfigured()) return false;

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedAuthToken();

  return Boolean(sessionToken && expectedToken && sessionToken === expectedToken);
}
