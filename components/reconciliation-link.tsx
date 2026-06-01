"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonClassName } from "@/components/button";
import { buildReconciliationData } from "@/lib/reconciliation";
import { useI18n } from "@/lib/i18n";
import { useBookkeeping } from "@/lib/storage";

export function ReconciliationLink({
  descriptionKey = "reconciliationCenterNotice"
}: {
  descriptionKey?: string;
}) {
  const { categories, settings, transactions } = useBookkeeping();
  const { t } = useI18n();
  const reconciliationData = useMemo(
    () =>
      buildReconciliationData(transactions, categories, {
        category: "all",
        endDate: `${settings.tax_year}-12-31`,
        issueType: "all",
        month: "all",
        receiptStatus: "all",
        reconciliationStatus: "all",
        reviewStatus: "all",
        startDate: `${settings.tax_year}-01-01`
      }),
    [categories, settings.tax_year, transactions]
  );

  if (reconciliationData.summary.unresolvedIssueCount === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-amber-200 bg-white p-4 shadow-soft">
      <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {t(descriptionKey).replace(
              "{count}",
              String(reconciliationData.summary.unresolvedIssueCount)
            )}
          </p>
        </div>
        <Link className={buttonClassName()} href="/reconciliation">
          {t("openReconciliationCenter")}
        </Link>
      </div>
    </section>
  );
}
