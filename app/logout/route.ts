import type { NextRequest } from "next/server";
import { createLogoutResponse } from "@/lib/logout-response";

export async function GET(request: NextRequest) {
  return createLogoutResponse(request);
}

export async function POST(request: NextRequest) {
  return createLogoutResponse(request);
}
