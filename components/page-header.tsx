import { clsx } from "clsx";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("relative overflow-hidden rounded-lg border border-line bg-white px-5 py-6 shadow-panel sm:px-6 lg:px-7", className)}>
      <div className="absolute inset-x-0 top-0 h-1 bg-marine" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="finance-kicker mb-2">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-ink sm:text-[2.45rem]">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  );
}
