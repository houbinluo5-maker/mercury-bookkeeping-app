import { NextResponse, type NextRequest } from "next/server";
import { isManagedReceiptPath, RECEIPT_BUCKET_NAME } from "@/lib/receipt-files";
import { isAuthenticatedRequest } from "@/lib/server-auth";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase-server";

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function fileNameFromPath(path: string) {
  return path.split("/").pop()?.replace(/["\\]/g, "") || "receipt";
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticatedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase Storage is not configured." },
      { status: 400 }
    );
  }

  const path = request.nextUrl.searchParams.get("path")?.trim() ?? "";

  if (!isManagedReceiptPath(path)) {
    return NextResponse.json({ error: "Receipt path is invalid." }, { status: 400 });
  }

  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase Storage is not configured." },
      { status: 400 }
    );
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${RECEIPT_BUCKET_NAME}/${encodeStoragePath(path)}`,
    {
      cache: "no-store",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`
      }
    }
  );

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: "Receipt file could not be loaded from Supabase Storage." },
      { status: response.status || 500 }
    );
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${fileNameFromPath(path)}"`,
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream"
    },
    status: 200
  });
}
