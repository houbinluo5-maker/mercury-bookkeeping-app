import { clsx } from "clsx";

export function SectionHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageToolbar({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function AlertBanner({
  children,
  tone = "info",
  icon
}: {
  children: React.ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-white text-slate-800 shadow-soft",
    warning: "border-amber-200 bg-white text-slate-800 shadow-soft",
    danger: "border-red-200 bg-white text-slate-800 shadow-soft",
    success: "border-emerald-200 bg-white text-slate-800 shadow-soft"
  };
  const accent = {
    info: "bg-sky-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    success: "bg-emerald-500"
  };

  return (
    <section className={clsx("notice relative flex gap-3 overflow-hidden", tones[tone])}>
      <span className={clsx("absolute inset-y-0 left-0 w-1", accent[tone])} />
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <section className="filter-shell">{children}</section>;
}

export function DataTableShell({
  children,
  title,
  description,
  actions,
  className
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("data-shell", className)}>
      {title || description || actions ? (
        <div className="border-b border-line bg-slate-50/60 px-4 py-4">
          <SectionHeader actions={actions} description={description} title={title ?? ""} />
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function CommandCard({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card p-4 transition hover:-translate-y-0.5 hover:border-marine/30 hover:shadow-panel">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-marine/10 bg-marine/5 text-marine">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ActionPanel({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card space-y-4 p-5">
      <SectionHeader description={description} title={title} />
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function SoftDivider() {
  return <div className="h-px bg-slate-200" />;
}

export function SectionCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={clsx("surface-card p-5", className)}>{children}</section>;
}

export function QuickActionCard({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-marine/30 hover:shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-marine/10 bg-marine/5 text-marine">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
