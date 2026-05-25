import { clsx } from "clsx";

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const toneClasses = {
    neutral: "border-line bg-white",
    green: "border-emerald-200 bg-emerald-50/80",
    amber: "border-amber-200 bg-amber-50/80",
    red: "border-red-200 bg-red-50/80",
    blue: "border-sky-200 bg-sky-50/80"
  };

  return (
    <div className={clsx("rounded-lg border p-4 shadow-panel", toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-ink tabular-nums">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}
