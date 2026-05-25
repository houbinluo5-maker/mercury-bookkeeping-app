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
    <div className={clsx("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-normal text-marine">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}
