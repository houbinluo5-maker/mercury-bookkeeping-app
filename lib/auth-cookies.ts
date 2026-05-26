import type { NextResponse } from "next/server";
import {
  ACTIVE_WORKSPACE_COOKIE,
  AUTH_COOKIE_NAME,
  SUPABASE_ACCESS_TOKEN_COOKIE,
  SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS,
  SUPABASE_REFRESH_TOKEN_COOKIE
} from "@/lib/auth";
import type { SupabaseAuthSession } from "@/lib/supabase-auth-server";
import type { Workspace } from "@/lib/types";

const secure = process.env.NODE_ENV === "production";

export function setSupabaseSessionCookies(
  response: NextResponse,
  session: SupabaseAuthSession,
  workspace: Workspace
) {
  response.cookies.set({
    name: SUPABASE_ACCESS_TOKEN_COOKIE,
    value: session.access_token,
    httpOnly: true,
    maxAge: session.expires_in ?? SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure
  });

  if (session.refresh_token) {
    response.cookies.set({
      name: SUPABASE_REFRESH_TOKEN_COOKIE,
      value: session.refresh_token,
      httpOnly: true,
      maxAge: SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure
    });
  }

  setActiveWorkspaceCookie(response, workspace);
}

export function setActiveWorkspaceCookie(response: NextResponse, workspace: Pick<Workspace, "id">) {
  response.cookies.set({
    name: ACTIVE_WORKSPACE_COOKIE,
    value: workspace.id,
    httpOnly: true,
    maxAge: SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [
    AUTH_COOKIE_NAME,
    SUPABASE_ACCESS_TOKEN_COOKIE,
    SUPABASE_REFRESH_TOKEN_COOKIE,
    ACTIVE_WORKSPACE_COOKIE
  ]) {
    response.cookies.set({
      name,
      value: "",
      expires: new Date(0),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure
    });
  }
}
