import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getReceiptContentType,
  getReceiptStorageExtension,
  isManagedReceiptPath,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  RECEIPT_BUCKET_NAME,
  RECEIPT_ALLOWED_MIME_TYPES,
  validateReceiptFile,
  type ReceiptFileValidationError
} from "@/lib/receipt-files";
import { logPermissionDenied } from "@/lib/permission-audit-server";
import {
  canDeleteReceipts,
  canUploadReceipts,
  permissionDeniedMessage
} from "@/lib/permissions";
import { getAuthenticatedContext } from "@/lib/server-auth";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase-server";

type StorageErrorBody = {
  error?: string;
  message?: string;
  statusCode?: string;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function forbidden(
  auth: Awaited<ReturnType<typeof getAuthenticatedContext>>,
  attemptedAction: string,
  entityId = ""
) {
  if (auth) {
    await logPermissionDenied(auth, attemptedAction, "receipt", entityId);
  }

  return NextResponse.json({ error: permissionDeniedMessage }, { status: 403 });
}

function supabaseNotConfigured() {
  return NextResponse.json(
    {
      error:
        "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server."
    },
    { status: 400 }
  );
}

function validationMessage(error: ReceiptFileValidationError) {
  if (error === "receiptFileEmpty") return "The selected file is empty.";
  if (error === "receiptFileTooLarge") {
    return "File is too large. Upload a file up to 10 MB.";
  }

  return "Unsupported file type. Upload a PDF, PNG, JPG, JPEG, or WebP file.";
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function parseStorageErrorBody(text: string): StorageErrorBody | null {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as StorageErrorBody;
  } catch {
    return { message: text.slice(0, 240) };
  }
}

function describeStorageError(status: number, statusText: string, body: StorageErrorBody | null) {
  const message = body?.message || body?.error || "";
  const combined = `${body?.statusCode ?? ""} ${message}`.toLowerCase();

  if (status === 404 || /bucket.*not.*found|not found/.test(combined)) {
    return "Supabase Storage bucket `receipts` was not found. Create a private bucket named `receipts` before uploading receipts.";
  }

  if (status === 401 || status === 403 || /jwt|token|permission|unauthorized/.test(combined)) {
    return "Supabase Storage rejected the server credentials. Confirm SUPABASE_SERVICE_ROLE_KEY is set server-side and has access to Storage.";
  }

  if (/mime|content type|file size|payload too large|too large/.test(combined)) {
    return message || "Supabase Storage rejected this file. Check the bucket MIME type and file size limits.";
  }

  return `Supabase Storage request failed. HTTP ${status} ${statusText}.${message ? ` ${message}` : ""}`;
}

async function storageRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase Storage is not configured.");
  }

  const response = await fetch(`${config.url}/storage/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = parseStorageErrorBody(await response.text());

    throw new Error(describeStorageError(response.status, response.statusText, body));
  }

  return response;
}

function sanitizePathSegment(value: string) {
  const safe = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "transaction";
}

function sanitizeFileName(file: File) {
  const extension = getReceiptStorageExtension(file);
  const baseName = file.name
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "receipt"}.${extension}`;
}

async function deleteStoredReceipt(path: string) {
  if (!path || !isManagedReceiptPath(path)) return;

  await storageRequest(`object/${RECEIPT_BUCKET_NAME}/${encodeStoragePath(path)}`, {
    method: "DELETE"
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!canUploadReceipts(auth.membership)) return forbidden(auth, "receipt.upload");
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const transactionId = String(formData.get("transactionId") ?? "").trim();
    const currentPath = String(formData.get("currentPath") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a receipt file to upload." }, { status: 400 });
    }

    if (!transactionId) {
      return NextResponse.json({ error: "A transaction id is required." }, { status: 400 });
    }

    const validationError = validateReceiptFile(file);

    if (validationError) {
      return NextResponse.json({ error: validationMessage(validationError) }, { status: 400 });
    }

    if (currentPath.startsWith("receipts/") && !currentPath.startsWith(`receipts/${auth.workspace.id}/`)) {
      return NextResponse.json({ error: "Receipt path does not belong to this workspace." }, { status: 403 });
    }

    const contentType = getReceiptContentType(file);
    const storagePath = [
      "receipts",
      sanitizePathSegment(auth.workspace.id),
      sanitizePathSegment(transactionId),
      `${Date.now()}-${randomUUID()}-${sanitizeFileName(file)}`
    ].join("/");

    await storageRequest(`object/${RECEIPT_BUCKET_NAME}/${encodeStoragePath(storagePath)}`, {
      body: file,
      headers: {
        "Cache-Control": "private, max-age=0",
        "Content-Type": contentType,
        "X-Upsert": "false"
      },
      method: "POST"
    });

    let deleteWarning = "";

    if (currentPath && currentPath !== storagePath && isManagedReceiptPath(currentPath)) {
      try {
        await deleteStoredReceipt(currentPath);
      } catch (error) {
        deleteWarning =
          error instanceof Error ? error.message : "The previous receipt could not be deleted.";
      }
    }

    return NextResponse.json({
      allowedMimeTypes: RECEIPT_ALLOWED_MIME_TYPES,
      deleteWarning,
      maxFileSizeBytes: MAX_RECEIPT_FILE_SIZE_BYTES,
      path: storagePath,
      viewUrl: `/api/receipts/file?path=${encodeURIComponent(storagePath)}`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receipt upload failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedContext(request);
  if (!auth) return unauthorized();
  if (!canDeleteReceipts(auth.membership)) return forbidden(auth, "receipt.delete");
  if (!isSupabaseConfigured()) return supabaseNotConfigured();

  try {
    const body = (await request.json()) as { path?: string };
    const path = String(body.path ?? "").trim();

    if (!path) return NextResponse.json({ ok: true });

    if (!isManagedReceiptPath(path)) {
      return NextResponse.json(
        { error: "Only receipt files uploaded by this app can be deleted from Supabase Storage." },
        { status: 400 }
      );
    }

    if (path.startsWith("receipts/") && !path.startsWith(`receipts/${auth.workspace.id}/`)) {
      return NextResponse.json({ error: "Receipt path does not belong to this workspace." }, { status: 403 });
    }

    await deleteStoredReceipt(path);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receipt delete failed." },
      { status: 500 }
    );
  }
}
