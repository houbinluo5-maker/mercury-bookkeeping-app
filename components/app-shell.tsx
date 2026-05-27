"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CircleAlert,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  ScrollText,
  PlusCircle,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCircle,
  UsersRound,
  Upload,
  WalletCards
} from "lucide-react";
import { clsx } from "clsx";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BrandMark } from "@/components/brand/brand-mark";
import { useBookkeeping } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

const navGroups = [
  {
    labelKey: "commandNav",
    items: [
      { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/transactions/new", labelKey: "addTransaction", icon: PlusCircle },
      { href: "/transactions", labelKey: "transactions", icon: ListChecks }
    ]
  },
  {
    labelKey: "importsNav",
    items: [
      { href: "/imports/mercury", labelKey: "importMercuryCsv", icon: Upload }
    ]
  },
  {
    labelKey: "financeOpsNav",
    items: [
      { href: "/reconciliation", labelKey: "reconciliationCenter", icon: CircleAlert },
      { href: "/receipts", labelKey: "receipts", icon: ReceiptText },
      { href: "/closing", labelKey: "monthlyClosing", icon: LockKeyhole },
      { href: "/audit", labelKey: "auditTrail", icon: ScrollText }
    ]
  },
  {
    labelKey: "reportsNav",
    items: [
      { href: "/reports/monthly", labelKey: "monthlyReport", icon: BarChart3 },
      { href: "/reports/quarterly", labelKey: "quarterlyReport", icon: WalletCards },
      { href: "/reports/annual-tax-summary", labelKey: "annualTaxSummary", icon: FileSpreadsheet },
      { href: "/reports/tax-package", labelKey: "taxPackage", icon: FileSpreadsheet }
    ]
  },
  {
    labelKey: "systemNav",
    items: [
      { href: "/accounts", labelKey: "chartOfAccounts", icon: Building2 },
      { href: "/account", labelKey: "accountSettings", icon: UserCircle },
      { href: "/team", labelKey: "teamMembers", icon: UsersRound },
      { href: "/settings", labelKey: "settings", icon: Settings }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

type AccountSummary = {
  role: string;
  user: { email: string; avatarUrl?: string } | null;
  workspace: { id: string; name: string; tax_year: number; business_type: string };
  workspaces?: Array<{
    business_type: string;
    id: string;
    is_active: boolean;
    name: string;
    role: string;
    status: string;
    tax_year: number;
  }>;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isShelllessPath(pathname: string) {
  return ["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback"].includes(pathname)
    || pathname.startsWith("/invite/");
}

function roleLabel(t: (key: string) => string, role: string) {
  const label = t(`role.${role}`);
  return label === `role.${role}` ? role : label;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { permissions, settings } = useBookkeeping();
  const { t } = useI18n();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [switchError, setSwitchError] = useState("");
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");

  useEffect(() => {
    if (isShelllessPath(pathname)) return;

    fetch("/api/auth/me")
      .then(async (response) => {
        if (response.ok) setAccount((await response.json()) as AccountSummary);
      })
      .catch(() => undefined);
  }, [pathname]);

  async function switchWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === account?.workspace.id) return;

    setSwitchError("");
    setSwitchingWorkspaceId(workspaceId);

    try {
      const response = await fetch("/api/workspaces/switch", {
        body: JSON.stringify({ workspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || t("workspaceSwitchError"));
      }

      window.location.reload();
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : t("workspaceSwitchError"));
      setSwitchingWorkspaceId("");
    }
  }

  if (isShelllessPath(pathname)) {
    return <main className="min-h-screen bg-paper">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-[#fbfaf7] xl:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <BrandLogo size="md" subtitle={t("brandSubtitle")} />
          <div className="mt-4 rounded-lg border border-marine/10 bg-white/95 px-3 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-ink">
                {account?.workspace.name ?? settings.company_name}
              </p>
              <span className="shrink-0 rounded-full bg-marine/10 px-2 py-0.5 text-[0.65rem] font-semibold text-marine">
                {roleLabel(t, account?.role ?? "owner")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{account?.workspace.tax_year ?? settings.tax_year}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="truncate">{account?.workspace.business_type ?? settings.business_type_tax_notes ?? settings.entity_type}</span>
            </div>
            {account?.workspaces?.length && account.workspaces.length > 1 ? (
              <label className="mt-3 block space-y-1">
                <span className="form-label">{t("switchWorkspace")}</span>
                <select
                  className="form-input h-9 text-xs"
                  disabled={Boolean(switchingWorkspaceId)}
                  onChange={(event) => void switchWorkspace(event.target.value)}
                  value={account.workspace.id}
                >
                  {account.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} - {roleLabel(t, workspace.role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-mint">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("cpaReadyWorkspace")}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{t("brandWorkspaceSummary")}</p>
            {switchError ? <p className="mt-2 text-xs font-medium text-red-700">{switchError}</p> : null}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between">
          <nav className="space-y-5 overflow-y-auto px-3 py-5">
            {navGroups.map((group) => (
              <div key={group.labelKey}>
                <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-normal text-slate-400">
                  {t(group.labelKey)}
                </p>
                <div className="mt-2 space-y-1">
                  {group.items
                    .filter((item) => item.href !== "/transactions/new" || permissions.canEditTransactions)
                    .filter((item) => item.href !== "/imports/mercury" || permissions.canEditTransactions)
                    .map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        className={clsx(
                          "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                          active
                            ? "bg-ink text-white shadow-sm"
                            : "text-slate-600 hover:bg-white hover:text-ink hover:shadow-sm"
                        )}
                        href={item.href}
                        key={item.href}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-3">
            <div className="mb-3 rounded-lg border border-line bg-white px-3 py-3 shadow-sm">
              <p className="truncate text-xs font-semibold text-ink">{account?.user?.email ?? "Legacy admin"}</p>
              <p className="mt-1 text-xs text-slate-500">{roleLabel(t, account?.role ?? "owner")}</p>
            </div>
            <a
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-ink"
              href="/logout"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span>{t("logout")}</span>
            </a>
          </div>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 shadow-sm backdrop-blur xl:hidden">
          <div className="flex h-16 items-center gap-3 overflow-x-auto px-4">
            <Link
              aria-label="Mercury Books"
              className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line bg-white px-2 text-ink shadow-sm"
              href="/"
              title="Mercury Books"
            >
              <BrandMark size="sm" />
            </Link>
            {navItems
              .filter((item) => item.href !== "/transactions/new" || permissions.canEditTransactions)
              .filter((item) => item.href !== "/imports/mercury" || permissions.canEditTransactions)
              .map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  aria-label={t(item.labelKey)}
                  className={clsx(
                    "flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm transition",
                    active
                      ? "border-marine bg-marine text-white"
                      : "border-line bg-white text-slate-700"
                  )}
                  href={item.href}
                  key={item.href}
                  title={t(item.labelKey)}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">{t(item.labelKey)}</span>
                </Link>
              );
            })}
            <a
              aria-label={t("logout")}
              className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
              href="/logout"
              title={t("logout")}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t("logout")}</span>
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
