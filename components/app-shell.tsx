"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CircleAlert,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  ReceiptText,
  Settings,
  Upload,
  WalletCards
} from "lucide-react";
import { clsx } from "clsx";
import { useBookkeeping } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/transactions/new", labelKey: "addTransaction", icon: PlusCircle },
  { href: "/transactions", labelKey: "transactions", icon: ListChecks },
  { href: "/imports/mercury", labelKey: "importMercuryCsv", icon: Upload },
  { href: "/accounts", labelKey: "chartOfAccounts", icon: Building2 },
  { href: "/receipts", labelKey: "receipts", icon: ReceiptText },
  { href: "/reconciliation", labelKey: "reconciliationCenter", icon: CircleAlert },
  { href: "/reports/monthly", labelKey: "monthlyReport", icon: BarChart3 },
  { href: "/reports/quarterly", labelKey: "quarterlyReport", icon: WalletCards },
  { href: "/reports/annual-tax-summary", labelKey: "annualTaxSummary", icon: FileSpreadsheet },
  { href: "/reports/tax-package", labelKey: "taxPackage", icon: FileSpreadsheet },
  { href: "/settings", labelKey: "settings", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useBookkeeping();
  const { t } = useI18n();

  if (pathname === "/login") {
    return <main className="min-h-screen bg-paper">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white xl:block">
        <div className="flex h-20 items-center gap-3 border-b border-line px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{settings.company_name}</p>
            <p className="truncate text-xs text-slate-500">
              {settings.business_type_tax_notes || settings.entity_type}
            </p>
          </div>
        </div>
        <div className="flex h-[calc(100vh-5rem)] flex-col justify-between">
          <nav className="space-y-1 px-3 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  className={clsx(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                    active
                      ? "bg-marine text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-ink"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
          <form action="/api/auth/logout" className="border-t border-line p-3" method="post">
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
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur xl:hidden">
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
