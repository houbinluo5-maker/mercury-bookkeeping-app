"use client";

import { useId, useState } from "react";
import { ExternalLink, RefreshCw, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/badge";
import { buttonClassName, Button } from "@/components/button";
import { useI18n } from "@/lib/i18n";
import {
  getReceiptAccessUrl,
  isManagedReceiptPath,
  RECEIPT_ACCEPT_ATTRIBUTE,
  validateReceiptFile
} from "@/lib/receipt-files";

type ReceiptUploadControlProps = {
  compact?: boolean;
  onReceiptLinkChange: (receiptLink: string) => void;
  receiptLink: string;
  receiptRequired: boolean;
  transactionId: string;
};

type ReceiptUploadResponse = {
  deleteWarning?: string;
  error?: string;
  path?: string;
};

async function readReceiptResponse(response: Response): Promise<ReceiptUploadResponse> {
  const text = await response.text();

  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as ReceiptUploadResponse;
  } catch {
    return { error: text.slice(0, 240) };
  }
}

export function ReceiptUploadControl({
  compact = false,
  onReceiptLinkChange,
  receiptLink,
  receiptRequired,
  transactionId
}: ReceiptUploadControlProps) {
  const inputId = useId();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"delete" | "upload" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hasReceipt = Boolean(receiptLink.trim());
  const receiptHref = getReceiptAccessUrl(receiptLink);
  const isBusy = Boolean(busy);

  async function uploadReceipt(file: File) {
    const validationError = validateReceiptFile(file);

    setError("");
    setMessage("");

    if (validationError) {
      setError(t(validationError));
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("transactionId", transactionId);
    if (receiptLink.trim()) formData.set("currentPath", receiptLink.trim());

    setBusy("upload");

    try {
      const response = await fetch("/api/receipts", {
        body: formData,
        method: "POST"
      });
      const result = await readReceiptResponse(response);

      if (!response.ok || !result.path) {
        throw new Error(result.error || t("receiptUploadError"));
      }

      onReceiptLinkChange(result.path);
      setMessage(result.deleteWarning || t("receiptUploaded"));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("receiptUploadError"));
    } finally {
      setBusy(null);
    }
  }

  async function deleteReceipt() {
    if (!receiptLink.trim()) return;

    setBusy("delete");
    setError("");
    setMessage("");

    try {
      if (isManagedReceiptPath(receiptLink)) {
        const response = await fetch("/api/receipts", {
          body: JSON.stringify({ path: receiptLink }),
          headers: { "Content-Type": "application/json" },
          method: "DELETE"
        });
        const result = await readReceiptResponse(response);

        if (!response.ok) {
          throw new Error(result.error || t("receiptDeleteError"));
        }
      }

      onReceiptLinkChange("");
      setMessage(t("receiptDeleted"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("receiptDeleteError"));
    } finally {
      setBusy(null);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      void uploadReceipt(file);
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {hasReceipt ? (
          <Badge tone="green">{t("receiptLinked")}</Badge>
        ) : receiptRequired ? (
          <Badge tone="red">{t("receiptMissing")}</Badge>
        ) : (
          <Badge tone="neutral">{t("receiptOptional")}</Badge>
        )}
        {receiptHref ? (
          <a
            aria-label={t("openReceipt")}
            className={buttonClassName("secondary", compact ? "h-9 px-2 text-xs" : "h-9")}
            href={receiptHref}
            rel="noreferrer"
            target="_blank"
            title={t("openReceipt")}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {compact ? null : t("openReceipt")}
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <label
          aria-disabled={isBusy}
          className={buttonClassName(
            "secondary",
            `${compact ? "h-9 px-2 text-xs" : ""} ${isBusy ? "pointer-events-none opacity-50" : ""}`
          )}
          htmlFor={inputId}
        >
          {hasReceipt ? (
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Upload aria-hidden="true" className="h-4 w-4" />
          )}
          {busy === "upload"
            ? t("receiptUploading")
            : hasReceipt
              ? t("replaceReceipt")
              : t("uploadReceipt")}
        </label>
        <input
          accept={RECEIPT_ACCEPT_ATTRIBUTE}
          className="hidden"
          disabled={isBusy}
          id={inputId}
          onChange={onFileChange}
          type="file"
        />
        {hasReceipt ? (
          <Button
            className={compact ? "h-9 px-2 text-xs" : ""}
            disabled={isBusy}
            onClick={deleteReceipt}
            variant="danger"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {busy === "delete" ? t("receiptDeleting") : t("deleteReceipt")}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">{t("receiptUploadHelp")}</p>
      {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
