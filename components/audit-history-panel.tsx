"use client";

import { displayAuditValue, auditActionLabelKey, auditFieldLabelKey, auditSourceLabelKey } from "@/lib/audit";
import { useI18n } from "@/lib/i18n";
import type { AuditLog } from "@/lib/types";

function formatAuditTimestamp(value: string, language: "en" | "zh") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function AuditHistoryPanel({
  entries,
  emptyLabel,
  limit,
  title
}: {
  entries: AuditLog[];
  emptyLabel: string;
  limit?: number;
  title?: string;
}) {
  const { language, t } = useI18n();
  const visibleEntries = typeof limit === "number" ? entries.slice(0, limit) : entries;

  return (
    <div className="space-y-3 rounded-lg border border-line bg-slate-50 p-4">
      {title ? <h3 className="text-sm font-semibold text-ink">{title}</h3> : null}
      {visibleEntries.length ? (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const fieldLabelKey = auditFieldLabelKey(entry.field_name);

            return (
              <article className="rounded-md border border-line bg-white px-3 py-3" key={entry.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-ink">{t(auditActionLabelKey(entry.action))}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">
                      {fieldLabelKey ? t(fieldLabelKey) : entry.field_name || t("summary")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatAuditTimestamp(entry.created_at, language)}
                  </p>
                </div>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">{t("oldValue")}:</span>{" "}
                    {displayAuditValue(entry.old_value)}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">{t("newValue")}:</span>{" "}
                    {displayAuditValue(entry.new_value)}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">{t("actor")}:</span>{" "}
                    {t(entry.actor)}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">{t("source")}:</span>{" "}
                    {t(auditSourceLabelKey(entry.source))}
                  </p>
                </div>
                {entry.reason ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{t("reason")}:</span> {entry.reason}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}
