import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createAuthToken,
  getAdminPassword,
  getExpectedAuthToken,
  isSafeRedirectPath
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const submittedPassword = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/");
  const adminPassword = getAdminPassword();
  const loginUrl = new URL("/login", request.url);

  if (!adminPassword) {
    loginUrl.searchParams.set("setup", "missing");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const submittedToken = await createAuthToken(submittedPassword);
  const expectedToken = await getExpectedAuthToken();

  if (submittedToken !== expectedToken) {
    loginUrl.searchParams.set("error", "invalid");
    if (isSafeRedirectPath(nextPath)) loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const redirectUrl = new URL(isSafeRedirectPath(nextPath) ? nextPath : "/", request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: expectedToken,
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
