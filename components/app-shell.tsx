"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  ReceiptText,
  Settings,
  WalletCards
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions/new", label: "Add Transaction", icon: PlusCircle },
  { href: "/transactions", label: "Transactions", icon: ListChecks },
  { href: "/accounts", label: "Chart of Accounts", icon: Building2 },
  { href: "/receipts", label: "Receipts", icon: ReceiptText },
  { href: "/reports/monthly", label: "Monthly Report", icon: BarChart3 },
  { href: "/reports/quarterly", label: "Quarterly Report", icon: WalletCards },
  { href: "/reports/annual-tax-summary", label: "Annual Tax Summary", icon: FileSpreadsheet },
  { href: "/settings", label: "Settings", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          <div>
            <p className="text-sm font-semibold text-ink">Mercury Books</p>
            <p className="text-xs text-slate-500">US LLC ecommerce</p>
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
                  <span>{item.label}</span>
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
              <span>Logout</span>
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
                  aria-label={item.label}
                  className={clsx(
                    "flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm transition",
                    active
                      ? "border-marine bg-marine text-white"
                      : "border-line bg-white text-slate-700"
                  )}
                  href={item.href}
                  key={item.href}
                  title={item.label}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <form action="/api/auth/logout" method="post">
              <button
                aria-label="Logout"
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50"
                title="Logout"
                type="submit"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Logout</span>
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
