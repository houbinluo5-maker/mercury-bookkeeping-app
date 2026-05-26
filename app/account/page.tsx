"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/ui-primitives";
import { useI18n } from "@/lib/i18n";

type AccountState = {
  authType: "supabase" | "legacy";
  role: string;
  user: {
    avatarUrl: string;
    email: string;
    id: string;
    name: string;
  } | null;
  workspace: {
    business_type: string;
    default_currency: string;
    id: string;
    name: string;
    tax_year: number;
  };
};

export default function AccountPage() {
  const [account, setAccount] = useState<AccountState | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => {
      if (response.ok) setAccount((await response.json()) as AccountState);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review authenticated user, workspace, and role context for this bookkeeping environment."
        eyebrow={t("systemNav")}
        title={t("accountSettings")}
      />
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <SectionHeader
          description={account?.authType === "legacy" ? "Legacy fallback" : "Supabase Auth"}
          title={account?.workspace.name ?? "Workspace"}
        />
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="form-label">Email</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.user?.email ?? "Legacy admin"}</dd>
          </div>
          <div>
            <dt className="form-label">Role</dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-ink">{account?.role ?? "owner"}</dd>
          </div>
          <div>
            <dt className="form-label">Workspace ID</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.workspace.id ?? ""}</dd>
          </div>
          <div>
            <dt className="form-label">Business type</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.workspace.business_type ?? "US LLC"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
