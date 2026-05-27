import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookies, clearSupabaseOAuthVerifierCookie } from "@/lib/auth-cookies";
import { canonicalUrl } from "@/lib/canonical-host";

export function createLogoutResponse(request: NextRequest) {
  const response = NextResponse.redirect(canonicalUrl("/login?logged_out=1", request), {
    status: 303
  });

  clearAuthCookies(response);
  clearSupabaseOAuthVerifierCookie(response);

  return response;
}
