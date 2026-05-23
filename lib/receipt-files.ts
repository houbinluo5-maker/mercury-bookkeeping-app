export const RECEIPT_BUCKET_NAME = "receipts";
export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT_ATTRIBUTE = ".pdf,.png,.jpg,.jpeg,.webp";

export const RECEIPT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp"
] as const;

type ReceiptMimeType = (typeof RECEIPT_ALLOWED_MIME_TYPES)[number];

const extensionToMimeType: Record<string, ReceiptMimeType> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp"
};

const mimeTypeToExtension: Record<ReceiptMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export type ReceiptFileValidationError =
  | "receiptFileEmpty"
  | "receiptFileTooLarge"
  | "receiptFileTypeError";

type ReceiptFileLike = {
  name: string;
  size: number;
  type?: string;
};

export function formatReceiptFileSize(bytes = MAX_RECEIPT_FILE_SIZE_BYTES) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function getReceiptFileExtension(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());

  return match?.[1]?.toLowerCase() ?? "";
}

function isReceiptMimeType(value: string): value is ReceiptMimeType {
  return RECEIPT_ALLOWED_MIME_TYPES.some((allowedType) => allowedType === value);
}

export function getReceiptContentType(file: ReceiptFileLike): ReceiptMimeType | "" {
  const normalizedType = file.type?.toLowerCase() ?? "";

  if (isReceiptMimeType(normalizedType)) {
    return normalizedType;
  }

  return extensionToMimeType[getReceiptFileExtension(file.name)] ?? "";
}

export function getReceiptStorageExtension(file: ReceiptFileLike) {
  const extension = getReceiptFileExtension(file.name);

  if (extensionToMimeType[extension]) return extension;

  const contentType = getReceiptContentType(file);

  return contentType ? mimeTypeToExtension[contentType] : "file";
}

export function validateReceiptFile(file: ReceiptFileLike): ReceiptFileValidationError | null {
  if (file.size <= 0) return "receiptFileEmpty";
  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) return "receiptFileTooLarge";
  if (!getReceiptContentType(file)) return "receiptFileTypeError";

  return null;
}

export function isManagedReceiptPath(value: string) {
  const path = value.trim();

  return (
    path.startsWith("transactions/") &&
    path.length <= 512 &&
    !path.includes("..") &&
    /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)
  );
}

export function getReceiptAccessUrl(receiptLink: string) {
  const value = receiptLink.trim();

  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (isManagedReceiptPath(value)) {
    return `/api/receipts/file?path=${encodeURIComponent(value)}`;
  }

  return value;
}
