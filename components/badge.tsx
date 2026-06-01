import { clsx } from "clsx";

type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue";

const tones: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800"
};

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold leading-none shadow-sm",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export const StatusBadge = Badge;
