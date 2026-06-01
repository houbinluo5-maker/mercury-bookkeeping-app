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
    neutral: "bg-slate-300",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-sky-500"
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-white p-5 shadow-soft">
      <span className={clsx("absolute inset-x-0 top-0 h-1", toneClasses[tone])} />
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-normal text-ink tabular-nums">{value}</p>
      {detail ? <p className="mt-3 text-sm leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}
