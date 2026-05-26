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
    green: "border-emerald-200 bg-gradient-to-br from-white to-emerald-50",
    amber: "border-amber-200 bg-gradient-to-br from-white to-amber-50",
    red: "border-red-200 bg-gradient-to-br from-white to-red-50",
    blue: "border-sky-200 bg-gradient-to-br from-white to-sky-50"
  };

  return (
    <div className={clsx("rounded-lg border p-5 shadow-panel", toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-ink tabular-nums">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}
