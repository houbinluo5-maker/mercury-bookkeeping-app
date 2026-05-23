"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, Download, FileJson, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { accountOptions, defaultSettings } from "@/lib/seed-data";
import { downloadExcel } from "@/lib/export-excel";
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
    importBackup
  } = useBookkeeping();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(settings), 0);

    return () => window.clearTimeout(timer);
  }, [settings]);

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
    setImportStatus("All local transactions were cleared.");
  }

  function reset() {
    if (window.confirm("Reset all local data back to the demo seed data?")) {
      resetDemoData();
      setDraft(defaultSettings);
      setImportStatus("Demo seed data restored.");
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

  async function restoreBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text()) as LocalBackup;
      if (!Array.isArray(backup.transactions) || !backup.settings) {
        throw new Error("Backup is missing transactions or settings.");
      }
      importBackup(backup);
      setImportStatus(`Restored backup from ${file.name}.`);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Could not restore backup.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={downloadBackupJson}>
              <FileJson aria-hidden="true" className="h-4 w-4" />
              Backup JSON
            </Button>
            <Button onClick={() => downloadExcel(transactions, "bookkeeping-full-export.xls")}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
        eyebrow="Local MVP"
        title="Settings"
      />

      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
          <div>
            <h2 className="text-lg font-semibold tracking-normal text-ink">Company Settings</h2>
            <p className="mt-1 text-sm text-slate-600">
              These values appear in the sidebar, dashboard, reports, and future exports.
            </p>
          </div>

        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="form-label">Company Name</span>
            <input
              className="form-input"
              onChange={(event) => setField("company_name", event.target.value)}
              value={draft.company_name}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">Business Type</span>
            <input
              className="form-input"
              onChange={(event) => setField("entity_type", event.target.value)}
              value={draft.entity_type}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">Tax Year</span>
            <input
              className="form-input"
              min="2020"
              onChange={(event) => setField("tax_year", Number(event.target.value))}
              type="number"
              value={draft.tax_year}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">Default Currency</span>
            <input
              className="form-input"
              onChange={(event) => setField("default_currency", event.target.value.toUpperCase())}
              value={draft.default_currency}
            />
          </label>
          <label className="space-y-1">
            <span className="form-label">Default Account Name</span>
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
            <span className="form-label">Bookkeeping Method</span>
            <select
              className="form-input"
              onChange={(event) =>
                setField("bookkeeping_method", event.target.value as AppSettings["bookkeeping_method"])
              }
              value={draft.bookkeeping_method}
            >
              <option value="cash">Cash</option>
              <option value="accrual">Accrual</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="form-label">Business Type / Tax Notes</span>
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
              Save settings
            </Button>
            {saved ? <Badge tone="green">Saved</Badge> : null}
          </div>
        </section>
      </form>

      <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-ink">Data Management</h2>
          <div className="mt-3 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This MVP stores bookkeeping data in this browser&apos;s localStorage. Back up your data
              regularly, especially before clearing browser data, changing devices, or deploying changes.
            </p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <p className="form-label">Data Source</p>
            <div className="mt-3">
              <Badge tone="blue">Seed data + localStorage</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <p className="form-label">Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{transactions.length}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <p className="form-label">Integrations</p>
            <div className="mt-3">
              <Badge tone="neutral">Not connected</Badge>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadBackupJson}>
            <FileJson aria-hidden="true" className="h-4 w-4" />
            Download backup
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            Restore backup
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
            Clear transactions
          </Button>
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset demo seed data
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
                <h2 className="text-lg font-semibold text-ink">Clear all transactions?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  This removes every transaction currently stored in localStorage, including demo/sample
                  seed transactions and any manual entries in this browser. Download a backup first if you
                  need to keep a copy.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button onClick={() => setClearModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmClearTransactions} variant="danger">
                Clear transactions
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
