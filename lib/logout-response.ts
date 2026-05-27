import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookies, clearSupabaseOAuthVerifierCookie } from "@/lib/auth-cookies";

export function createLogoutResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?logged_out=1", request.url), {
    status: 303
  });

  clearAuthCookies(response);
  clearSupabaseOAuthVerifierCookie(response);

  return response;
}
