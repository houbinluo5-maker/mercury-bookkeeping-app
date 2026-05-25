"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, Download, FileJson, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { accountOptions, defaultSettings } from "@/lib/seed-data";
import { downloadExcel } from "@/lib/export-excel";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";
import type { AppSettings, LocalBackup } from "@/lib/types";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    clearTransactions,
    resetDemoData,
    transactions,
    exportBackup,
    importBackup,
    storageStatus,
    syncToSupabase,
    loadFromSupabase,
    migrateLocalDataToSupabase,
    checkStorageHealth
  } = useBookkeeping();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [storageActionStatus, setStorageActionStatus] = useState("");
  const [storageBusy, setStorageBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const healthCheckedRef = useRef(false);
  const { t } = useI18n();

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(settings), 0);

    return () => window.clearTimeout(timer);
  }, [settings]);

  useEffect(() => {
    if (healthCheckedRef.current) return;
    healthCheckedRef.current = true;
    void checkStorageHealth();
  }, [checkStorageHealth]);

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSettings(draft);
    setSaved(true);
  }

  function confirmClearTransactions() {
    clearTransactions();
    setClearModalOpen(false);
    setImportStatus(t("clearedTransactions"));
  }

  function reset() {
    if (window.confirm(t("resetDemoDataQuestion"))) {
      resetDemoData();
      setDraft(defaultSettings);
      setImportStatus(t("restoredDemoData"));
    }
  }

  function downloadBackupJson() {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bookkeeping-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function storageStatusLabel() {
    if (storageStatus.mode === "checking") return t("checkingStorage");
    if (isSupabaseConnected()) return t("supabaseConnected");
    if (storageStatus.mode === "error") return t("supabaseError");
    return t("localStorageMode");
  }

  function storageStatusTone(): "neutral" | "green" | "amber" | "red" | "blue" {
    if (isSupabaseConnected()) return "green";
    if (storageStatus.mode === "error") return "red";
    if (storageStatus.mode === "checking") return "blue";
    return "amber";
  }

  function isSupabaseConnected() {
    return storageStatus.supabaseConnected || storageStatus.mode === "supabase";
  }

  function healthBadgeTone(value: string | undefined): "neutral" | "green" | "amber" | "red" | "blue" {
    if (value === "ok") return "green";
    if (value === "missing") return "amber";
    if (value === "error") return "red";
    return "neutral";
  }

  function formatLastChecked() {
    if (!storageStatus.lastCheckedAt) return "-";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(storageStatus.lastCheckedAt));
  }

  async function runStorageAction(action: () => Promise<boolean>, successKey: string) {
    setStorageBusy(true);
    setStorageActionStatus("");

    const ok = await action();

    setStorageActionStatus(ok ? t(successKey) : t("supabaseNotConfiguredWarning"));
    setStorageBusy(false);
  }

  async function restoreBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text()) as LocalBackup;
      if (!Array.isArray(backup.transactions) || !backup.settings) {
        throw new Error(t("backupMissingFields"));
      }
      importBackup(backup);
      setImportStatus(`${t("restoredBackupPrefix")} ${file.name}.`);
    } catch (error) {
      setImportStatus(
        error instanceof Error && error.message === t("backupMissingFields")
          ? error.message
          : t("couldNotRestoreBackup")
      );
    } finally {
      event.target.value = "";
    }
  }

  const supabaseConnected = isSupabaseConnected();
  const backupWriteDisabledNotice = storageStatus.notice || t("fullBackupSyncDisabledNotice");
  const storageErrorMessage = storageStatus.error || (storageStatus.mode === "error" ? storageStatus.message : "");
  const storageModeText =
    storageStatus.mode === "local" && supabaseConnected
      ? t("localDraftMode")
      : supabaseConnected
        ? t("supabaseConnected")
        : t("localStorageMode");
  const healthRows = storageStatus.health
    ? [
        [t("supabaseUrl"), storageStatus.health.supabase_url],
        [t("serviceRoleKey"), storageStatus.health.service_role_key],
        [t("transactionsTable"), storageStatus.health.transactions],
        [t("auditLogsTable"), storageStatus.health.audit_logs],
        [t("monthlyClosingsTable"), storageStatus.health.monthly_closings]
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={downloadBackupJson}>
              <FileJson aria-hidden="true" className="h-4 w-4" />
              {t("backupJson")}
            </Button>
            <Button onClick={() => downloadExcel(transactions, "bookkeeping-full-export.xls")}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportExcel")}
            </Button>
          </>
        }
        eyebrow={t("localMvp")}
        description={t("settingsPageDescription")}
        title={t("settings")}
      />

      <form className="space-y-6" onSubmit={submit}>
        <section className="surface-card space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold tracking-normal text-ink">{t("companySettings")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("companySettingsHelp")}</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="form-label">{t("language")}</span>
              <select
                className="form-input"
                onChange={(event) => setField("language", event.target.value as AppSettings["language"])}
                value={draft.language}
              >
                <option value="en">{t("english")}</option>
                <option value="zh">{t("simplifiedChinese")}</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("companyName")}</span>
              <input
                className="form-input"
                onChange={(event) => setField("company_name", event.target.value)}
                value={draft.company_name}
              />
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("businessType")}</span>
              <input
                className="form-input"
                onChange={(event) => setField("entity_type", event.target.value)}
                value={draft.entity_type}
              />
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("taxYear")}</span>
              <input
                className="form-input"
                min="2020"
                onChange={(event) => setField("tax_year", Number(event.target.value))}
                type="number"
                value={draft.tax_year}
              />
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("defaultCurrency")}</span>
              <input
                className="form-input"
                onChange={(event) => setField("default_currency", event.target.value.toUpperCase())}
                value={draft.default_currency}
              />
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("defaultAccountName")}</span>
              <input
                className="form-input"
                list="settings-account-options"
                onChange={(event) => setField("default_account", event.target.value)}
                value={draft.default_account}
              />
              <datalist id="settings-account-options">
                {accountOptions.map((account) => (
                  <option key={account} value={account} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1">
              <span className="form-label">{t("bookkeepingMethod")}</span>
              <select
                className="form-input"
                onChange={(event) =>
                  setField("bookkeeping_method", event.target.value as AppSettings["bookkeeping_method"])
                }
                value={draft.bookkeeping_method}
              >
                <option value="cash">{t("cash")}</option>
                <option value="accrual">{t("accrual")}</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="form-label">{t("businessTypeTaxNotes")}</span>
              <textarea
                className="form-textarea"
                onChange={(event) => setField("business_type_tax_notes", event.target.value)}
                value={draft.business_type_tax_notes}
              />
            </label>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              <Save aria-hidden="true" className="h-4 w-4" />
              {t("saveSettings")}
            </Button>
            {saved ? <Badge tone="green">{t("saved")}</Badge> : null}
          </div>
        </section>
      </form>

      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-normal text-ink">{t("supabasePersistence")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("supabasePersistenceHelp")}</p>
          </div>
          <Badge tone={storageStatusTone()}>{storageStatusLabel()}</Badge>
        </div>

        {(storageStatus.mode === "local" && !supabaseConnected) || storageStatus.mode === "error" ? (
          <div className="notice flex gap-3 border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {storageStatus.mode === "error"
                ? storageStatus.message
                : t("localStorageFallbackWarning")}
            </p>
          </div>
        ) : null}

        {supabaseConnected ? (
          <div className="notice flex gap-3 border-blue-200 bg-blue-50 text-blue-800">
            <Database aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{backupWriteDisabledNotice}</p>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("storageStatus")}</p>
            <div className="mt-3">
              <Badge tone={storageStatusTone()}>{storageStatusLabel()}</Badge>
            </div>
          </div>
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("transactions")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{transactions.length}</p>
          </div>
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("dataSource")}</p>
            <div className="mt-3">
              <Badge tone={supabaseConnected ? "green" : "amber"}>
                {storageModeText}
              </Badge>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-slate-50 p-4">
          <dl className="grid gap-3 text-sm md:grid-cols-4">
            <div>
              <dt className="form-label">{t("apiStatus")}</dt>
              <dd className="mt-1 font-medium text-ink">
                {typeof storageStatus.apiStatus === "number"
                  ? `${storageStatus.apiStatus} ${storageStatus.apiStatusText || ""}`.trim()
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="form-label">{t("storageMode")}</dt>
              <dd className="mt-1 font-medium text-ink">{storageModeText}</dd>
            </div>
            <div>
              <dt className="form-label">{t("lastChecked")}</dt>
              <dd className="mt-1 font-medium text-ink">{formatLastChecked()}</dd>
            </div>
            <div>
              <dt className="form-label">{t("errorMessage")}</dt>
              <dd className="mt-1 font-medium text-ink">{storageErrorMessage || "-"}</dd>
            </div>
          </dl>
          {healthRows.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {healthRows.map(([label, value]) => (
                <div key={label} className="rounded-md border border-line bg-white px-3 py-2">
                  <p className="form-label">{label}</p>
                  <div className="mt-2">
                    <Badge tone={healthBadgeTone(value)}>{value ? t(`health.${value}`) : "-"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-2">
          {!supabaseConnected ? (
            <Button
              disabled={storageBusy}
              onClick={() => runStorageAction(syncToSupabase, "syncedToSupabase")}
            >
              <Database aria-hidden="true" className="h-4 w-4" />
              {t("syncToSupabase")}
            </Button>
          ) : null}
          <Button
            disabled={storageBusy}
            onClick={() => runStorageAction(loadFromSupabase, "loadedFromSupabase")}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("loadFromSupabase")}
          </Button>
          {!supabaseConnected ? (
            <Button
              disabled={storageBusy}
              onClick={() => runStorageAction(migrateLocalDataToSupabase, "migratedToSupabase")}
            >
              <Upload aria-hidden="true" className="h-4 w-4" />
              {t("migrateLocalDataToSupabase")}
            </Button>
          ) : null}
          <Button
            disabled={storageBusy}
            onClick={() => runStorageAction(checkStorageHealth, "checkedStorageHealth")}
          >
            <Database aria-hidden="true" className="h-4 w-4" />
            {t("checkSupabaseHealth")}
          </Button>
          <Button onClick={downloadBackupJson}>
            <FileJson aria-hidden="true" className="h-4 w-4" />
            {t("exportLocalBackupJson")}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            {t("importLocalBackupJson")}
          </Button>
          {storageActionStatus ? <Badge tone="blue">{storageActionStatus}</Badge> : null}
        </div>
        {supabaseConnected ? (
          <p className="text-sm text-slate-600">{t("importLocalDraftModeNotice")}</p>
        ) : null}
      </section>

      <section className="surface-card space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-ink">{t("dataManagement")}</h2>
          <div className="notice mt-3 flex gap-3 border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t("dataManagementWarning")}</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("dataSource")}</p>
            <div className="mt-3">
              <Badge tone={supabaseConnected ? "green" : "amber"}>
                {supabaseConnected ? storageModeText : t("seedDataLocalStorage")}
              </Badge>
            </div>
          </div>
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("transactions")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{transactions.length}</p>
          </div>
          <div className="surface-card p-4 shadow-none">
            <p className="form-label">{t("integrations")}</p>
            <div className="mt-3">
              <Badge tone="neutral">{t("notConnected")}</Badge>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadBackupJson}>
            <FileJson aria-hidden="true" className="h-4 w-4" />
            {t("exportLocalBackupJson")}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            {t("importLocalBackupJson")}
          </Button>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={restoreBackup}
            ref={fileInputRef}
            type="file"
          />
          <Button onClick={() => setClearModalOpen(true)} variant="danger">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {t("clearTransactions")}
          </Button>
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t("resetDemoSeedData")}
          </Button>
          {importStatus ? <Badge tone="blue">{importStatus}</Badge> : null}
        </div>
      </section>

      {clearModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                <Database aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">{t("clearAllTransactionsQuestion")}</h2>
                <p className="mt-2 text-sm text-slate-600">{t("clearTransactionsBody")}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button onClick={() => setClearModalOpen(false)}>{t("cancel")}</Button>
              <Button onClick={confirmClearTransactions} variant="danger">
                {t("clearTransactions")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
