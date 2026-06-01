"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import {
  auditActionLabelKey,
  auditActions,
  auditBadgeLabels,
  auditEntityLabelKey,
  auditEntityTypes,
  auditResult,
  auditSourceLabelKey,
  auditSources,
  describeAuditEntry,
  filterAuditLogsForRole,
  formatAuditTime
} from "@/lib/audit";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import { downloadCsv } from "@/lib/tax-package";
import type { AuditAction, AuditEntityType, AuditLog, AuditSource } from "@/lib/types";

const pageSize = 100;

const csvHeaders = [
  "Timestamp",
  "Workspace ID",
  "Actor Email",
  "Actor Role",
  "Entity Type",
  "Entity ID",
  "Action",
  "Source",
  "Result",
  "Details",
  "Reason"
];

function actorLabel(entry: AuditLog) {
  return entry.actor_email || entry.actor || "Unknown";
}

function roleLabel(entry: AuditLog) {
  return entry.actor_role && entry.actor_role !== "unknown" ? entry.actor_role : entry.actor;
}

function badgeTone(label: string): "neutral" | "green" | "amber" | "red" | "blue" {
  if (label === "Denied" || label === "Security") return "red";
  if (label === "Success") return "green";
  if (label === "Export") return "blue";
  if (label === "Month close") return "amber";

  return "neutral";
}

function csvRows(entries: AuditLog[], language: "en" | "zh") {
  return entries.map((entry) => [
    entry.created_at,
    entry.workspace_id ?? "",
    entry.actor_email ?? "",
    entry.actor_role ?? "",
    entry.entity_type,
    entry.entity_id,
    entry.action,
    entry.source,
    auditResult(entry),
    describeAuditEntry(entry, language),
    entry.reason
  ]);
}

export default function AuditPage() {
  const { auditLogs, permissions, recordExportAudit, settings, workspaceRole } = useBookkeeping();
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [startDate, setStartDate] = useState(`${settings.tax_year}-01-01`);
  const [endDate, setEndDate] = useState(`${settings.tax_year}-12-31`);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [source, setSource] = useState<AuditSource | "all">("all");
  const [result, setResult] = useState<"all" | "denied" | "success">("all");
  const [page, setPage] = useState(0);

  const visibleEntries = useMemo(
    () => filterAuditLogsForRole(auditLogs, workspaceRole),
    [auditLogs, workspaceRole]
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedActor = actorEmail.trim().toLowerCase();

    return visibleEntries.filter((entry) => {
      const auditDate = entry.created_at.slice(0, 10);
      const detailText = describeAuditEntry(entry, language);
      const displayTime = formatAuditTime(entry.created_at, language);

      if (startDate && auditDate < startDate) return false;
      if (endDate && auditDate > endDate) return false;
      if (entityType !== "all" && entry.entity_type !== entityType) return false;
      if (action !== "all" && entry.action !== action) return false;
      if (source !== "all" && entry.source !== source) return false;
      if (result !== "all" && auditResult(entry) !== result) return false;
      if (normalizedActor && !actorLabel(entry).toLowerCase().includes(normalizedActor)) return false;

      if (!normalizedQuery) return true;

      return [
        entry.created_at,
        displayTime,
        entry.workspace_id,
        actorLabel(entry),
        roleLabel(entry),
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.source,
        auditResult(entry),
        detailText,
        entry.reason
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [action, actorEmail, endDate, entityType, language, query, result, source, startDate, visibleEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageEntries = filteredEntries.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  async function exportAuditLog() {
    const fileName = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    const allowed = await recordExportAudit({
      entityId: "audit-trail",
      entityType: "workspace",
      exportType: "audit_log",
      fileName,
      reportPeriod: `${startDate} to ${endDate}`
    });

    if (!allowed) return;

    downloadCsv(csvHeaders, csvRows(filteredEntries, language), fileName);
  }

  if (!permissions.canViewAuditTrail) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={settings.company_name} title={t("auditTrail")} />
        <PermissionNotice detailKey="askOwnerForAuditAccess" titleKey="auditRestrictedForRole" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          permissions.canExportReports ? (
            <Button onClick={() => void exportAuditLog()}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportAuditLogCsv")}
            </Button>
          ) : null
        }
        eyebrow={`${filteredEntries.length} ${t("entries")} - ${workspaceRole === "unknown" ? "Unknown" : t(`role.${workspaceRole}`)}`}
        title={t("auditTrail")}
      />

      {!permissions.canExportReports ? (
        <PermissionNotice detailKey="askOwnerForExportAccess" titleKey="exportRestrictedForRole" />
      ) : null}

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <p className="text-sm text-slate-600">{t("auditTrailHelp")}</p>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
            <span className="form-label">{t("actorEmail")}</span>
            <input
              className="form-input"
              onChange={(event) => setActorEmail(event.target.value)}
              placeholder="owner@example.com"
              value={actorEmail}
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
            <span className="form-label">{t("result")}</span>
            <select
              className="form-input"
              onChange={(event) => setResult(event.target.value as "all" | "denied" | "success")}
              value={result}
            >
              <option value="all">{t("allResults")}</option>
              <option value="success">{t("success")}</option>
              <option value="denied">{t("denied")}</option>
            </select>
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
          <table className="min-w-[1180px] border-collapse">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-3">{t("time")}</th>
                <th className="px-3 py-3">{t("actor")}</th>
                <th className="px-3 py-3">{t("role")}</th>
                <th className="px-3 py-3">{t("action")}</th>
                <th className="px-3 py-3">{t("entity")}</th>
                <th className="px-3 py-3">{t("source")}</th>
                <th className="px-3 py-3">{t("details")}</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr className="hover:bg-slate-50" key={entry.id}>
                  <td className="table-cell whitespace-nowrap text-sm text-slate-600">
                    <p>{formatAuditTime(entry.created_at, language)}</p>
                    <p className="mt-1 text-xs text-slate-400">{t("beijingTime")}</p>
                  </td>
                  <td className="table-cell min-w-52">
                    <p className="font-medium text-ink">{actorLabel(entry)}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{entry.actor_user_id || entry.workspace_id || "-"}</p>
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {entry.actor_role && entry.actor_role !== "unknown" ? t(`role.${entry.actor_role}`) : roleLabel(entry)}
                  </td>
                  <td className="table-cell min-w-52">
                    <p className="font-medium text-ink">{t(auditActionLabelKey(entry.action))}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {auditBadgeLabels(entry).map((label) => (
                        <Badge key={label} tone={badgeTone(label)}>
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell min-w-52">
                    <p>{t(auditEntityLabelKey(entry.entity_type))}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{entry.entity_id || "-"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {entry.workspace_id ? `Workspace ${entry.workspace_id}` : ""}
                    </p>
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {t(auditSourceLabelKey(entry.source))}
                  </td>
                  <td className="table-cell min-w-96 text-sm text-slate-700">
                    <p>{describeAuditEntry(entry, language)}</p>
                    {entry.reason ? <p className="mt-1 text-xs text-slate-500">{entry.reason}</p> : null}
                  </td>
                </tr>
              ))}
              {pageEntries.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={7}>
                    {t("noAuditEntries")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-slate-600">
          <span>
            {currentPage * pageSize + (pageEntries.length ? 1 : 0)}-{currentPage * pageSize + pageEntries.length} {t("of")} {filteredEntries.length}
          </span>
          <div className="flex gap-2">
            <Button disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              {t("previous")}
            </Button>
            <Button disabled={currentPage >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>
              {t("next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
