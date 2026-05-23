import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedAuthToken, isAdminPasswordConfigured } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);

  if (!isAdminPasswordConfigured()) {
    loginUrl.searchParams.set("setup", "missing");
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedAuthToken();

  if (sessionToken && sessionToken === expectedToken) {
    return NextResponse.next();
  }

  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/accounts/:path*",
    "/receipts/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/transactions/:path*"
  ]
};
