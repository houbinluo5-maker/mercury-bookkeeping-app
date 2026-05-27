import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createAuthToken,
  getAdminPassword,
  getExpectedAuthToken,
  isSafeRedirectPath
} from "@/lib/auth";
import { setSupabaseSessionCookies } from "@/lib/auth-cookies";
import { canonicalUrl, createCanonicalHostRedirect } from "@/lib/canonical-host";
import { ensureProfileAndWorkspace, signInWithEmail } from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const submittedPassword = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/");
  const legacy = String(formData.get("legacy") ?? "") === "1";
  const adminPassword = getAdminPassword();
  const loginUrl = canonicalUrl("/login", request);

  if (email && !legacy) {
    try {
      const session = await signInWithEmail(email, submittedPassword);
      const { workspace } = await ensureProfileAndWorkspace(session.user);
      const response = NextResponse.redirect(
        canonicalUrl(isSafeRedirectPath(nextPath) ? nextPath : "/", request),
        { status: 303 }
      );

      setSupabaseSessionCookies(response, session, workspace);

      return response;
    } catch (error) {
      loginUrl.searchParams.set("error", "supabase");
      loginUrl.searchParams.set("message", error instanceof Error ? error.message : "Login failed.");
      if (isSafeRedirectPath(nextPath)) loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl, { status: 303 });
    }
  }

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

  const redirectUrl = canonicalUrl(isSafeRedirectPath(nextPath) ? nextPath : "/", request);
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
