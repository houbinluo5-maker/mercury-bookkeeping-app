import { NextResponse, type NextRequest } from "next/server";
import { isSafeRedirectPath } from "@/lib/auth";
import { setSupabaseSessionCookies } from "@/lib/auth-cookies";
import { canonicalUrl, createCanonicalHostRedirect } from "@/lib/canonical-host";
import {
  canCreatePublicAccount,
  ensureProfileAndWorkspace,
  signUpWithEmail
} from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/");
  const registerUrl = canonicalUrl("/register", request);

  if (!email || !password || !fullName || !workspaceName) {
    registerUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(registerUrl, { status: 303 });
  }

  if (password !== confirmPassword) {
    registerUrl.searchParams.set("error", "password_mismatch");
    return NextResponse.redirect(registerUrl, { status: 303 });
  }

  try {
    if (!(await canCreatePublicAccount())) {
      registerUrl.searchParams.set("error", "invite_only");
      return NextResponse.redirect(registerUrl, { status: 303 });
    }

    const session = await signUpWithEmail(email, password, fullName);

    if (!session.access_token) {
      registerUrl.searchParams.set("error", "supabase");
      registerUrl.searchParams.set(
        "message",
        "Account created. Check your email to confirm the account before signing in."
      );
      return NextResponse.redirect(registerUrl, { status: 303 });
    }

    const { workspace } = await ensureProfileAndWorkspace(session.user, workspaceName);
    const response = NextResponse.redirect(
      canonicalUrl(isSafeRedirectPath(nextPath) ? nextPath : "/", request),
      { status: 303 }
    );

    setSupabaseSessionCookies(response, session, workspace);

    return response;
  } catch (error) {
    registerUrl.searchParams.set("error", "supabase");
    registerUrl.searchParams.set("message", error instanceof Error ? error.message : "Registration failed.");
    return NextResponse.redirect(registerUrl, { status: 303 });
  }
}
