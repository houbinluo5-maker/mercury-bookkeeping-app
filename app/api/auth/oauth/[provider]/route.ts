import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl, isAuthProviderEnabled } from "@/lib/auth";

const providerMap = {
  azure: "azure",
  github: "github",
  google: "google"
} as const;

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

  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", providerMap[mappedProvider]);
  authorizeUrl.searchParams.set("redirect_to", new URL("/auth/callback", request.url).toString());

  if (mappedProvider === "azure") {
    // Supabase Azure Auth requires email scope so the external provider returns a usable email.
    authorizeUrl.searchParams.set("scopes", "email");
  }

  return NextResponse.redirect(authorizeUrl);
}
