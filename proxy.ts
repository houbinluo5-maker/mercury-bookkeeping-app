import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SUPABASE_ACCESS_TOKEN_COOKIE,
  getExpectedAuthToken,
  isAdminPasswordConfigured
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);

  const supabaseToken = request.cookies.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;

  if (supabaseToken) return NextResponse.next();

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedAuthToken();

  if (isAdminPasswordConfigured() && sessionToken && sessionToken === expectedToken) {
    return NextResponse.next();
  }

  if (!isAdminPasswordConfigured()) {
    loginUrl.searchParams.set("setup", "missing");
  }
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/accounts/:path*",
    "/audit/:path*",
    "/closing/:path*",
    "/imports/:path*",
    "/reconciliation/:path*",
    "/receipts/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/transactions/:path*"
  ]
};
