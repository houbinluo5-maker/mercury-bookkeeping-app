import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SUPABASE_ACCESS_TOKEN_COOKIE,
  getExpectedAuthToken,
  isAdminPasswordConfigured
} from "@/lib/auth";
import { createCanonicalHostRedirect, canonicalUrl } from "@/lib/canonical-host";

const protectedPathPrefixes = [
  "/account",
  "/accounts",
  "/audit",
  "/closing",
  "/imports",
  "/reconciliation",
  "/receipts",
  "/reports",
  "/settings",
  "/team",
  "/transactions"
];

function isProtectedPath(pathname: string) {
  return pathname === "/" || protectedPathPrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const loginUrl = canonicalUrl("/login", request);

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"
  ]
};
