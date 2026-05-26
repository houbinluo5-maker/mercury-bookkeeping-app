import { NextResponse, type NextRequest } from "next/server";
import { requestPasswordReset } from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pageUrl = new URL("/forgot-password", request.url);

  if (!email) {
    pageUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(pageUrl, { status: 303 });
  }

  try {
    await requestPasswordReset(email, new URL("/reset-password", request.url).toString());
    pageUrl.searchParams.set("sent", "1");
  } catch (error) {
    pageUrl.searchParams.set("error", "supabase");
    pageUrl.searchParams.set("message", error instanceof Error ? error.message : "Reset request failed.");
  }

  return NextResponse.redirect(pageUrl, { status: 303 });
}
