import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookies } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?logout=1", request.url), {
    status: 303
  });

  clearAuthCookies(response);

  return response;
}
