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
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900"
  };

  return (
    <section className={clsx("notice flex gap-3", tones[tone])}>
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
        <div className="border-b border-slate-200 px-4 py-4">
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
    <div className="surface-card p-4 transition hover:-translate-y-0.5 hover:border-marine/40">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-marine/10 text-marine">
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
    <section className="surface-card space-y-4 p-4">
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
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function SoftDivider() {
  return <div className="h-px bg-slate-200" />;
}
