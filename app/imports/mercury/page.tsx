"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  mercuryImportRowToDraft,
  parseMercuryCsv,
  type MercuryImportRow
} from "@/lib/mercury-csv-import";
import { useBookkeeping } from "@/lib/storage";

type ImportSummary = {
  importedRows: number;
  rowsNeedingReview: number;
  skippedDuplicateRows: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  totalRowsParsed: number;
};

function sumRows(rows: MercuryImportRow[], field: "money_in" | "money_out") {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

export default function MercuryImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    categories,
    importTransactions,
    settings,
    storageStatus,
    transactions
  } = useBookkeeping();
  const { categoryLabel, t, taxLineLabel } = useI18n();
  const [rows, setRows] = useState<MercuryImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const selectedRows = useMemo(
    () =>
      rows.filter(
        (row) => row.selected && !row.imported && row.date && (row.money_in > 0 || row.money_out > 0)
      ),
    [rows]
  );

  const previewSummary = useMemo(
    () => ({
      duplicateRows: rows.filter((row) => row.duplicate && !row.imported).length,
      rowsNeedingReview: rows.filter(
        (row) => !row.imported && (row.category === "Uncategorized" || row.tax_line === "Needs review")
      ).length,
      selectedMoneyIn: sumRows(selectedRows, "money_in"),
      selectedMoneyOut: sumRows(selectedRows, "money_out")
    }),
    [rows, selectedRows]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const parsedRows = parseMercuryCsv(
        text,
        transactions,
        categories,
        settings.default_account,
        settings.default_currency
      );

      setRows(parsedRows);
      setFileName(file.name);
      setError("");
      setImportSummary(null);
    } catch {
      setRows([]);
      setFileName(file.name);
      setError("Could not parse this CSV file. Check that it has a header row and comma-separated values.");
      setImportSummary(null);
    }
  }

  function updateRow(rowId: string, patch: Partial<MercuryImportRow>) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  }

  function updateCategory(rowId: string, categoryName: string) {
    const category = categories.find((item) => item.name === categoryName);

    updateRow(rowId, {
      category: category?.name ?? categoryName,
      receipt_required: category?.receipt_required_default ?? true,
      tax_line: category?.tax_line ?? "Needs review"
    });
  }

  function setAllSelected(selected: boolean) {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        selected: !row.imported && row.date && (row.money_in > 0 || row.money_out > 0) ? selected : false
      }))
    );
  }

  function handleImport() {
    if (!selectedRows.length) return;

    importTransactions(selectedRows.map((row) => mercuryImportRowToDraft(row)));
    setImportSummary({
      importedRows: selectedRows.length,
      rowsNeedingReview: selectedRows.filter(
        (row) => row.category === "Uncategorized" || row.tax_line === "Needs review"
      ).length,
      skippedDuplicateRows: rows.filter((row) => row.duplicate && !row.selected && !row.imported).length,
      totalMoneyIn: sumRows(selectedRows, "money_in"),
      totalMoneyOut: sumRows(selectedRows, "money_out"),
      totalRowsParsed: rows.length
    });
    setRows((currentRows) =>
      currentRows.map((row) =>
        selectedRows.some((selectedRow) => selectedRow.rowId === row.rowId)
          ? { ...row, imported: true, selected: false }
          : row
      )
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Badge tone={storageStatus.mode === "supabase" ? "green" : "amber"}>
            {storageStatus.mode === "supabase" ? t("supabaseConnected") : t("localStorageMode")}
          </Badge>
        }
        eyebrow={fileName || t("manualEntry")}
        title={t("importMercuryCsv")}
      />

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("importMercuryCsvUpload")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {t("importMercuryCsvHelp")}
            </p>
            <p className="mt-2 text-sm text-slate-500">{t("importMercuryCsvPrivacy")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <input
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="primary">
              <FileUp aria-hidden="true" className="h-4 w-4" />
              {t("chooseCsvFile")}
            </Button>
            <Button disabled={!rows.length} onClick={() => setAllSelected(false)}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              {t("clearSelection")}
            </Button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      {rows.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="form-label">{t("totalRowsParsed")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="form-label">{t("selected")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{selectedRows.length}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="form-label">{t("possibleDuplicate")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{previewSummary.duplicateRows}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="form-label">{t("totalMoneyIn")}</p>
            <p className="mt-2 text-2xl font-semibold text-mint">
              {formatCurrency(previewSummary.selectedMoneyIn, settings.default_currency)}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="form-label">{t("totalMoneyOut")}</p>
            <p className="mt-2 text-2xl font-semibold text-coral">
              {formatCurrency(previewSummary.selectedMoneyOut, settings.default_currency)}
            </p>
          </div>
        </section>
      ) : null}

      {importSummary ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="font-semibold text-emerald-900">{t("mercuryImportSummary")}</h2>
              <dl className="mt-3 grid gap-3 text-sm text-emerald-900 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <dt className="font-semibold">{t("totalRowsParsed")}</dt>
                  <dd>{importSummary.totalRowsParsed}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("importedRows")}</dt>
                  <dd>{importSummary.importedRows}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("skippedDuplicateRows")}</dt>
                  <dd>{importSummary.skippedDuplicateRows}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("rowsNeedingReview")}</dt>
                  <dd>{importSummary.rowsNeedingReview}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("totalMoneyIn")}</dt>
                  <dd>{formatCurrency(importSummary.totalMoneyIn, settings.default_currency)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("totalMoneyOut")}</dt>
                  <dd>{formatCurrency(importSummary.totalMoneyOut, settings.default_currency)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">{t("previewImport")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {rows.length ? `${rows.length} ${t("parsedRows")}` : t("noCsvRows")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!rows.length} onClick={() => setAllSelected(true)}>
              {t("selectAllRows")}
            </Button>
            <Button disabled={!selectedRows.length} onClick={handleImport} variant="primary">
              <Upload aria-hidden="true" className="h-4 w-4" />
              {t("importSelectedRows")}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] border-collapse">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-3">{t("selected")}</th>
                  <th className="px-3 py-3">{t("date")}</th>
                  <th className="px-3 py-3">{t("vendor")}</th>
                  <th className="px-3 py-3">{t("description")}</th>
                  <th className="px-3 py-3 text-right">{t("moneyIn")}</th>
                  <th className="px-3 py-3 text-right">{t("moneyOut")}</th>
                  <th className="px-3 py-3">{t("currency")}</th>
                  <th className="px-3 py-3">{t("suggestedCategory")}</th>
                  <th className="px-3 py-3">{t("suggestedTaxLine")}</th>
                  <th className="px-3 py-3">{t("receiptRequired")}</th>
                  <th className="px-3 py-3">{t("reconciled")}</th>
                  <th className="px-3 py-3">{t("duplicateWarning")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const canSelect = Boolean(row.date && (row.money_in > 0 || row.money_out > 0));

                  return (
                    <tr className="hover:bg-slate-50" key={row.rowId}>
                      <td className="table-cell">
                        <input
                          checked={row.selected}
                          className="h-4 w-4 rounded border-line text-marine"
                          disabled={row.imported || !canSelect}
                          onChange={(event) => updateRow(row.rowId, { selected: event.target.checked })}
                          type="checkbox"
                        />
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {row.date ? formatDate(row.date) : t("needsReview")}
                      </td>
                      <td className="table-cell min-w-44">
                        <p className="font-medium text-ink">{row.vendor}</p>
                        {row.reference ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {t("reference")}: {row.reference}
                          </p>
                        ) : null}
                      </td>
                      <td className="table-cell min-w-56">{row.description}</td>
                      <td className="table-cell text-right font-medium text-mint">
                        {row.money_in ? formatCurrency(row.money_in, row.currency) : "-"}
                      </td>
                      <td className="table-cell text-right font-medium text-coral">
                        {row.money_out ? formatCurrency(row.money_out, row.currency) : "-"}
                      </td>
                      <td className="table-cell whitespace-nowrap">{row.currency}</td>
                      <td className="table-cell min-w-52">
                        <select
                          className="form-input"
                          disabled={row.imported}
                          onChange={(event) => updateCategory(row.rowId, event.target.value)}
                          value={row.category}
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.name}>
                              {categoryLabel(category.name)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="table-cell min-w-52">{taxLineLabel(row.tax_line)}</td>
                      <td className="table-cell">
                        <input
                          checked={row.receipt_required}
                          className="h-4 w-4 rounded border-line text-marine"
                          disabled={row.imported}
                          onChange={(event) =>
                            updateRow(row.rowId, { receipt_required: event.target.checked })
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          checked={row.reconciled}
                          className="h-4 w-4 rounded border-line text-marine"
                          disabled={row.imported}
                          onChange={(event) =>
                            updateRow(row.rowId, { reconciled: event.target.checked })
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="table-cell min-w-48">
                        <div className="flex flex-wrap gap-2">
                          {row.imported ? <Badge tone="green">{t("imported")}</Badge> : null}
                          {row.duplicate ? (
                            <Badge tone="red">{t("possibleDuplicate")}</Badge>
                          ) : (
                            <Badge tone="green">{t("noDuplicate")}</Badge>
                          )}
                          {row.category === "Uncategorized" || row.tax_line === "Needs review" ? (
                            <Badge tone="amber">{t("needsReview")}</Badge>
                          ) : null}
                        </div>
                        {row.duplicateReason ? (
                          <p className="mt-2 text-xs text-slate-500">{row.duplicateReason}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {!rows.length ? (
                  <tr>
                    <td className="px-3 py-10 text-center text-sm text-slate-500" colSpan={12}>
                      {t("noCsvRows")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
