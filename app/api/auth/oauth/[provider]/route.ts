import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import {
  SUPABASE_OAUTH_CODE_VERIFIER_COOKIE,
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isAuthProviderEnabled,
  isSafeRedirectPath
} from "@/lib/auth";

const providerMap = {
  azure: "azure",
  github: "github",
  google: "google"
} as const;

const secure = process.env.NODE_ENV === "production";

function createCodeVerifier() {
  return randomBytes(48).toString("base64url");
}

function codeChallengeFor(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!(provider in providerMap)) {
    return NextResponse.redirect(new URL("/login?error=provider_disabled", request.url), { status: 303 });
  }

  const mappedProvider = provider as keyof typeof providerMap;

  if (!isAuthProviderEnabled(mappedProvider)) {
    return NextResponse.redirect(new URL("/login?error=provider_disabled", request.url), { status: 303 });
  }

  const supabaseUrl = getPublicSupabaseUrl().replace(/\/+$/, "");
  const anonKey = getPublicSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=supabase_config", request.url), { status: 303 });
  }

  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/";
  const nextPath = isSafeRedirectPath(requestedNext) ? requestedNext : "/";
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", nextPath);

  const codeVerifier = createCodeVerifier();
  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", providerMap[mappedProvider]);
  authorizeUrl.searchParams.set("redirect_to", callbackUrl.toString());
  authorizeUrl.searchParams.set("code_challenge", codeChallengeFor(codeVerifier));
  authorizeUrl.searchParams.set("code_challenge_method", "s256");
  authorizeUrl.searchParams.set("flow_type", "pkce");

  if (mappedProvider === "azure") {
    // Supabase Azure Auth requires the email scope so Microsoft returns a usable email claim.
    authorizeUrl.searchParams.set("scopes", "email");
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: SUPABASE_OAUTH_CODE_VERIFIER_COOKIE,
    value: codeVerifier,
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure
  });

  return response;
}
