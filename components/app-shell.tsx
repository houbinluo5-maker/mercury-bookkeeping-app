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
  Upload,
  WalletCards
} from "lucide-react";
import { clsx } from "clsx";
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
      { href: "/settings", labelKey: "settings", icon: Settings }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

type AccountSummary = {
  role: string;
  user: { email: string; avatarUrl?: string } | null;
  workspace: { name: string; tax_year: number; business_type: string };
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useBookkeeping();
  const { t } = useI18n();
  const [account, setAccount] = useState<AccountSummary | null>(null);

  useEffect(() => {
    if (["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback"].includes(pathname)) return;

    fetch("/api/auth/me")
      .then(async (response) => {
        if (response.ok) setAccount((await response.json()) as AccountSummary);
      })
      .catch(() => undefined);
  }, [pathname]);

  if (["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback"].includes(pathname)) {
    return <main className="min-h-screen bg-paper">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-[#fbfaf7] xl:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white shadow-sm">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Mercury Bookkeeping</p>
            <p className="truncate text-xs font-medium text-slate-500">{t("executiveFinanceOs")}</p>
          </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="truncate text-sm font-semibold text-ink">{account?.workspace.name ?? settings.company_name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{account?.workspace.tax_year ?? settings.tax_year}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="truncate">{account?.workspace.business_type ?? settings.business_type_tax_notes ?? settings.entity_type}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-mint">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("cpaReadyWorkspace")}</span>
            </div>
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
                  {group.items.map((item) => {
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
          <form action="/api/auth/logout" className="border-t border-slate-200 p-3" method="post">
            <div className="mb-3 rounded-lg border border-line bg-white px-3 py-3 shadow-sm">
              <p className="truncate text-xs font-semibold text-ink">{account?.user?.email ?? "Legacy admin"}</p>
              <p className="mt-1 text-xs capitalize text-slate-500">{account?.role ?? "owner"}</p>
            </div>
            <button
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-ink"
              type="submit"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span>{t("logout")}</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 shadow-sm backdrop-blur xl:hidden">
          <div className="flex h-16 items-center gap-3 overflow-x-auto px-4">
            {navItems.map((item) => {
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
            <form action="/api/auth/logout" method="post">
              <button
                aria-label={t("logout")}
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                title={t("logout")}
                type="submit"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">{t("logout")}</span>
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
