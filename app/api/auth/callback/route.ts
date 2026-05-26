import { NextResponse, type NextRequest } from "next/server";
import { setSupabaseSessionCookies } from "@/lib/auth-cookies";
import {
  SUPABASE_OAUTH_CODE_VERIFIER_COOKIE,
  isSafeRedirectPath
} from "@/lib/auth";
import {
  ensureProfileAndWorkspace,
  exchangeOAuthCodeForSession
} from "@/lib/supabase-auth-server";

const secure = process.env.NODE_ENV === "production";
const genericOAuthError = "OAuth sign-in could not be completed. Please start sign-in again.";
const missingVerifierError =
  "OAuth sign-in expired or was started in another browser session. Please start sign-in again.";

function safeNextPath(value: string | null | undefined) {
  return value && isSafeRedirectPath(value) ? value : "/";
}

function clearVerifierCookie(response: NextResponse) {
  response.cookies.set({
    name: SUPABASE_OAUTH_CODE_VERIFIER_COOKIE,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure
  });
}

function callbackErrorRedirect(request: NextRequest, nextPath: string, message: string) {
  const url = new URL("/auth/callback", request.url);
  url.searchParams.set("error", "oauth_callback");
  url.searchParams.set("message", message);
  url.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(url, { status: 303 });
  clearVerifierCookie(response);
  return response;
}

function safeCallbackMessage(message: string | null | undefined) {
  const trimmed = message?.trim() ?? "";

  if (!trimmed || trimmed === "oauth_callback") {
    return genericOAuthError;
  }

  return trimmed.replace(/[\r\n]+/g, " ").slice(0, 500);
}

function providerErrorMessage(request: NextRequest) {
  return safeCallbackMessage(
    request.nextUrl.searchParams.get("message") ||
      request.nextUrl.searchParams.get("error_description") ||
      request.nextUrl.searchParams.get("error")
  );
}

async function exchangeCode(request: NextRequest, code: string, nextPath: string) {
  const codeVerifier = request.cookies.get(SUPABASE_OAUTH_CODE_VERIFIER_COOKIE)?.value ?? "";

  if (!codeVerifier) {
    throw new Error(missingVerifierError);
  }

  const session = await exchangeOAuthCodeForSession(code, codeVerifier);
  const { workspace } = await ensureProfileAndWorkspace(session.user);
  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });

  setSupabaseSessionCookies(response, session, workspace);
  clearVerifierCookie(response);

  return response;
}

export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");

  if (request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description")) {
    return callbackErrorRedirect(request, nextPath, providerErrorMessage(request));
  }

  if (!code) {
    return callbackErrorRedirect(request, nextPath, "No OAuth authorization code was returned. Please start sign-in again.");
  }

  try {
    return await exchangeCode(request, code, nextPath);
  } catch (error) {
    return callbackErrorRedirect(
      request,
      nextPath,
      error instanceof Error ? error.message : "OAuth session exchange failed."
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string; next?: string };
    const nextPath = safeNextPath(body.next);

    if (!body.code) {
      return NextResponse.json({ error: "Missing OAuth authorization code." }, { status: 400 });
    }

    const response = await exchangeCode(request, body.code, nextPath);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth session exchange failed." },
      { status: 401 }
    );
  }
}
