"use client";

import { useI18n } from "@/lib/i18n";

export function YearSelect({
  years,
  value,
  onChange
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="flex items-center gap-2">
      <span className="form-label">{t("year")}</span>
      <select className="form-input w-32" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MonthSelect({
  value,
  onChange
}: {
  value: number;
  onChange: (month: number) => void;
}) {
  const { monthLabel, t } = useI18n();

  return (
    <label className="flex items-center gap-2">
      <span className="form-label">{t("month")}</span>
      <select className="form-input w-44" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {monthLabel(month - 1)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function QuarterSelect({
  value,
  onChange
}: {
  value: number;
  onChange: (quarter: number) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="flex items-center gap-2">
      <span className="form-label">{t("quarter")}</span>
      <select className="form-input w-28" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {[1, 2, 3, 4].map((quarter) => (
          <option key={quarter} value={quarter}>
            Q{quarter}
          </option>
        ))}
      </select>
    </label>
  );
}
