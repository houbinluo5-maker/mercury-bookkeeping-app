import { NextResponse, type NextRequest } from "next/server";
import { setSupabaseSessionCookies } from "@/lib/auth-cookies";
import {
  ensureProfileAndWorkspace,
  getUserFromAccessToken,
  type SupabaseAuthSession
} from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SupabaseAuthSession>;

    if (!body.access_token) {
      return NextResponse.json({ error: "Missing Supabase access token." }, { status: 400 });
    }

    const user = await getUserFromAccessToken(body.access_token);
    const { workspace } = await ensureProfileAndWorkspace(user);
    const response = NextResponse.json({ ok: true, workspace });

    setSupabaseSessionCookies(response, {
      access_token: body.access_token,
      expires_in: body.expires_in,
      refresh_token: body.refresh_token,
      token_type: body.token_type,
      user
    }, workspace);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session exchange failed." },
      { status: 401 }
    );
  }
}
