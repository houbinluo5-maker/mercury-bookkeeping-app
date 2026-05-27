import { NextResponse, type NextRequest } from "next/server";
import { canonicalUrl, createCanonicalHostRedirect } from "@/lib/canonical-host";
import { requestPasswordReset } from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pageUrl = canonicalUrl("/forgot-password", request);

  if (!email) {
    pageUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(pageUrl, { status: 303 });
  }

  try {
    await requestPasswordReset(email, canonicalUrl("/reset-password", request).toString());
    pageUrl.searchParams.set("sent", "1");
  } catch (error) {
    pageUrl.searchParams.set("error", "supabase");
    pageUrl.searchParams.set("message", error instanceof Error ? error.message : "Reset request failed.");
  }

  return NextResponse.redirect(pageUrl, { status: 303 });
}
