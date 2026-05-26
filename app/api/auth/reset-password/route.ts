import { NextResponse, type NextRequest } from "next/server";
import { updatePassword } from "@/lib/supabase-auth-server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { accessToken?: string; password?: string };

  if (!body.accessToken || !body.password) {
    return NextResponse.json({ error: "Missing access token or password." }, { status: 400 });
  }

  try {
    await updatePassword(body.accessToken, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Password reset failed." },
      { status: 400 }
    );
  }
}
