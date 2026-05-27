import type { NextRequest } from "next/server";
import { createCanonicalHostRedirect } from "@/lib/canonical-host";
import { createLogoutResponse } from "@/lib/logout-response";

export async function GET(request: NextRequest) {
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  return createLogoutResponse(request);
}

export async function POST(request: NextRequest) {
  const canonicalRedirect = createCanonicalHostRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  return createLogoutResponse(request);
}
