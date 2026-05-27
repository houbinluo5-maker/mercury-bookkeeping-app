import { NextResponse, type NextRequest } from "next/server";

export const CANONICAL_PRODUCTION_ORIGIN = "https://www.novarn.de";
export const CANONICAL_PRODUCTION_HOST = "www.novarn.de";
export const APEX_PRODUCTION_HOST = "novarn.de";

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function normalizedRequestHost(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function usesNovarnProductionHost(request: NextRequest) {
  if (!isProductionRuntime()) return false;

  const host = normalizedRequestHost(request);
  return host === APEX_PRODUCTION_HOST || host === CANONICAL_PRODUCTION_HOST;
}

export function requestOrigin(request: NextRequest) {
  return usesNovarnProductionHost(request) ? CANONICAL_PRODUCTION_ORIGIN : request.nextUrl.origin;
}

export function canonicalUrl(path: string, request: NextRequest) {
  return new URL(path, requestOrigin(request));
}

export function createCanonicalHostRedirect(request: NextRequest) {
  if (!isProductionRuntime() || normalizedRequestHost(request) !== APEX_PRODUCTION_HOST) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = CANONICAL_PRODUCTION_HOST;
  url.port = "";

  return NextResponse.redirect(url, { status: 308 });
}
