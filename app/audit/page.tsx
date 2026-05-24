"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import {
  auditActionLabelKey,
  auditActions,
  auditEntityLabelKey,
  auditEntityTypes,
  auditFieldLabelKey,
  auditSourceLabelKey,
  auditSources,
  displayAuditValue
} from "@/lib/audit";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import { downloadCsv } from "@/lib/tax-package";
import type { AuditAction, AuditEntityType, AuditLog, AuditSource } from "@/lib/types";

const csvHeaders = [
  "Timestamp",
  "Entity Type",
  "Entity ID",
  "Action",
  "Field",
  "Old Value",
  "New Value",
  "Reason",
  "Actor",
  "Source"
];

function csvRows(entries: AuditLog[]) {
  return entries.map((entry) => [
    entry.created_at,
    entry.entity_type,
    entry.entity_id,
    entry.action,
    entry.field_name,
    entry.old_value,
    entry.new_value,
    entry.reason,
    entry.actor,
    entry.source
  ]);
}

export default function AuditPage() {
  const { auditLogs, settings } = useBookkeeping();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(`${settings.tax_year}-01-01`);
  const [endDate, setEndDate] = useState(`${settings.tax_year}-12-31`);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [source, setSource] = useState<AuditSource | "all">("all");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return auditLogs.filter((entry) => {
      const auditDate = entry.created_at.slice(0, 10);

      if (startDate && auditDate < startDate) return false;
      if (endDate && auditDate > endDate) return false;
      if (entityType !== "all" && entry.entity_type !== entityType) return false;
      if (action !== "all" && entry.action !== action) return false;
      if (source !== "all" && entry.source !== source) return false;

      if (!normalizedQuery) return true;

      return [
        entry.created_at,
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.field_name,
        entry.old_value,
        entry.new_value,
        entry.reason,
        entry.actor,
        entry.source
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [action, auditLogs, endDate, entityType, query, source, startDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() =>
              downloadCsv(
                csvHeaders,
                csvRows(filteredEntries),
                `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("exportAuditLogCsv")}
          </Button>
        }
        eyebrow={`${filteredEntries.length} ${t("entries")}`}
        title={t("auditTrail")}
      />

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <p className="text-sm text-slate-600">{t("auditTrailHelp")}</p>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative block xl:col-span-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="form-input pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchAudit")}
              value={query}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("startDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("endDate")}</span>
            <input
              className="form-input"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("entityType")}</span>
            <select
              className="form-input"
              onChange={(event) => setEntityType(event.target.value as AuditEntityType | "all")}
              value={entityType}
            >
              <option value="all">{t("allEntityTypes")}</option>
              {auditEntityTypes.map((value) => (
                <option key={value} value={value}>
                  {t(auditEntityLabelKey(value))}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("action")}</span>
            <select
              className="form-input"
              onChange={(event) => setAction(event.target.value as AuditAction | "all")}
              value={action}
            >
              <option value="all">{t("allActions")}</option>
              {auditActions.map((value) => (
                <option key={value} value={value}>
                  {t(auditActionLabelKey(value))}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="form-label">{t("source")}</span>
            <select
              className="form-input"
              onChange={(event) => setSource(event.target.value as AuditSource | "all")}
              value={source}
            >
              <option value="all">{t("allSources")}</option>
              {auditSources.map((value) => (
                <option key={value} value={value}>
                  {t(auditSourceLabelKey(value))}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">{t("timestamp")}</th>
                <th className="px-3 py-3">{t("entityType")}</th>
                <th className="px-3 py-3">{t("entityId")}</th>
                <th className="px-3 py-3">{t("action")}</th>
                <th className="px-3 py-3">{t("field")}</th>
                <th className="px-3 py-3">{t("oldValue")}</th>
                <th className="px-3 py-3">{t("newValue")}</th>
                <th className="px-3 py-3">{t("reason")}</th>
                <th className="px-3 py-3">{t("actor")}</th>
                <th className="px-3 py-3">{t("source")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const fieldLabelKey = auditFieldLabelKey(entry.field_name);

                return (
                  <tr className="hover:bg-slate-50" key={entry.id}>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-600">
                      {entry.created_at.replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {t(auditEntityLabelKey(entry.entity_type))}
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-600">{entry.entity_id}</td>
                    <td className="table-cell whitespace-nowrap">
                      {t(auditActionLabelKey(entry.action))}
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {fieldLabelKey ? t(fieldLabelKey) : entry.field_name || t("summary")}
                    </td>
                    <td className="table-cell text-sm text-slate-600">
                      {displayAuditValue(entry.old_value)}
                    </td>
                    <td className="table-cell text-sm text-slate-600">
                      {displayAuditValue(entry.new_value)}
                    </td>
                    <td className="table-cell min-w-52 text-sm text-slate-600">
                      {entry.reason || "-"}
                    </td>
                    <td className="table-cell whitespace-nowrap">{t(entry.actor)}</td>
                    <td className="table-cell whitespace-nowrap">
                      {t(auditSourceLabelKey(entry.source))}
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>
                    {t("noAuditEntries")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
