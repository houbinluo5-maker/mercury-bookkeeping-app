import { monthName } from "@/lib/format";

export function YearSelect({
  years,
  value,
  onChange
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="form-label">Year</span>
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
  return (
    <label className="flex items-center gap-2">
      <span className="form-label">Month</span>
      <select className="form-input w-44" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {monthName(month - 1)}
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
  return (
    <label className="flex items-center gap-2">
      <span className="form-label">Quarter</span>
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
