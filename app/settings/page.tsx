"use client";

import { useState } from "react";
import { Download, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { accountOptions, defaultSettings } from "@/lib/seed-data";
import { downloadExcel } from "@/lib/export-excel";
import { useBookkeeping } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData, transactions } = useBookkeeping();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSettings(draft);
    setSaved(true);
  }

  function reset() {
    if (window.confirm("Reset local sample data?")) {
      resetDemoData();
      setDraft(defaultSettings);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => downloadExcel(transactions, "bookkeeping-full-export.xls")}>
            <Download aria-hidden="true" className="h-4 w-4" />
            Export
          </Button>
        }
        eyebrow="Local MVP"
        title="Settings"
      />

      <form className="space-y-6" onSubmit={submit}>
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
            <span className="form-label">Entity Type</span>
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
            <span className="form-label">Default Account</span>
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
        </section>

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
          <Button type="submit" variant="primary">
            <Save aria-hidden="true" className="h-4 w-4" />
            Save settings
          </Button>
          <Button onClick={reset} variant="danger">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset sample data
          </Button>
          {saved ? <Badge tone="green">Saved</Badge> : null}
        </div>
      </form>
    </div>
  );
}
