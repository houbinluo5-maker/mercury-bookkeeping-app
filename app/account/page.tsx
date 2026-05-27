"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { AlertBanner, SectionHeader } from "@/components/ui-primitives";
import { useI18n } from "@/lib/i18n";

type AccountState = {
  authProvider: string;
  authType: "supabase" | "legacy";
  legacyWorkspaceClaim: {
    canClaim: boolean;
    claimedByCurrentUser: boolean;
    claimedByOtherUser: boolean;
    hasData: boolean;
    workspace: {
      id: string;
      name: string;
    } | null;
  } | null;
  normalizedEmail: string;
  ownsWorkspace: boolean;
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
  workspaces: Array<{
    business_type: string;
    id: string;
    is_active: boolean;
    membership_id: string;
    name: string;
    role: string;
    status: string;
    tax_year: number;
  }>;
};

function roleLabel(t: (key: string) => string, role: string) {
  const label = t(`role.${role}`);
  return label === `role.${role}` ? role : label;
}

export default function AccountPage() {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState("");
  const { t } = useI18n();

  async function fetchAccountState() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) return null;

    return (await response.json()) as AccountState;
  }

  async function loadAccount() {
    const nextAccount = await fetchAccountState();

    if (nextAccount) setAccount(nextAccount);
  }

  useEffect(() => {
    let active = true;

    fetchAccountState().then((nextAccount) => {
      if (active && nextAccount) setAccount(nextAccount);
    });

    return () => {
      active = false;
    };
  }, []);

  async function claimLegacyWorkspace() {
    setClaiming(true);
    setClaimError("");
    setClaimSuccess("");

    try {
      const response = await fetch("/api/auth/claim-legacy-workspace", {
        method: "POST"
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || t("legacyWorkspaceClaimError"));
      }

      setClaimSuccess(t("legacyWorkspaceClaimed"));
      await loadAccount();
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : t("legacyWorkspaceClaimError"));
    } finally {
      setClaiming(false);
    }
  }

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

  const claim = account?.legacyWorkspaceClaim;
  const showClaimCard = account?.authType === "supabase" && claim?.hasData && !claim.claimedByCurrentUser;

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("accountPageDescription")}
        eyebrow={t("systemNav")}
        title={t("accountSettings")}
      />

      {claimSuccess ? (
        <AlertBanner icon={<CheckCircle2 className="h-5 w-5" />} tone="success">
          <p className="text-sm font-semibold">{claimSuccess}</p>
        </AlertBanner>
      ) : null}

      {claimError ? (
        <AlertBanner tone="danger">
          <p className="text-sm font-semibold">{claimError}</p>
        </AlertBanner>
      ) : null}

      {switchError ? (
        <AlertBanner tone="danger">
          <p className="text-sm font-semibold">{switchError}</p>
        </AlertBanner>
      ) : null}

      <section className="surface-card p-5">
        <SectionHeader
          description={account?.authType === "legacy" ? t("legacyAdminFallback") : "Supabase Auth"}
          title={t("workspaceIdentity")}
        />
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("signedInEmail")}</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.user?.email ?? "Legacy admin"}</dd>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("authProvider")}</dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-ink">{account?.authProvider ?? "legacy"}</dd>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("activeWorkspace")}</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.workspace.name ?? "Workspace"}</dd>
            <p className="mt-1 break-all text-xs text-slate-500">{account?.workspace.id ?? ""}</p>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("workspaceOwnership")}</dt>
            <dd className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={account?.ownsWorkspace ? "green" : "blue"}>
                {account?.ownsWorkspace ? t("workspaceOwnerStatus") : t("workspaceMemberStatus")}
              </Badge>
              <span className="text-sm font-semibold text-ink">{roleLabel(t, account?.role ?? "owner")}</span>
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("businessType")}</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.workspace.business_type ?? "US LLC"}</dd>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/70 p-4">
            <dt className="form-label">{t("normalizedEmail")}</dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{account?.normalizedEmail || "n/a"}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-line p-5">
          <SectionHeader
            description={t("allWorkspacesDescription")}
            title={t("allWorkspaces")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("workspaceName")}</th>
                <th className="px-4 py-3">{t("businessType")}</th>
                <th className="px-4 py-3">{t("role")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3 text-right">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(account?.workspaces ?? []).map((workspace) => (
                <tr className="hover:bg-slate-50/70" key={workspace.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{workspace.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{workspace.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{workspace.business_type}</td>
                  <td className="px-4 py-3">
                    <Badge tone={workspace.role === "owner" ? "green" : "blue"}>
                      {roleLabel(t, workspace.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={workspace.is_active ? "green" : "neutral"}>
                      {workspace.is_active ? t("currentWorkspace") : workspace.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {workspace.is_active ? (
                      <span className="text-xs font-medium text-slate-500">{t("activeWorkspace")}</span>
                    ) : (
                      <Button
                        disabled={Boolean(switchingWorkspaceId)}
                        onClick={() => void switchWorkspace(workspace.id)}
                      >
                        {switchingWorkspaceId === workspace.id ? (
                          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        ) : null}
                        {t("switchWorkspace")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {account && !account.workspaces.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    {t("noAccessibleWorkspaces")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {showClaimCard ? (
        <section className="surface-card overflow-hidden border-marine/20">
          <div className="border-b border-line bg-marine/[0.03] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-marine text-white">
                  <KeyRound aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="section-title">{t("legacyWorkspaceFound")}</h2>
                  <p className="section-subtitle max-w-2xl">{t("legacyWorkspaceFoundDescription")}</p>
                </div>
              </div>
              <Badge tone={claim?.claimedByOtherUser ? "amber" : "blue"}>
                {claim?.claimedByOtherUser ? t("legacyWorkspaceAlreadyClaimed") : t("workspaceOwnership")}
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-3 text-sm leading-6 text-slate-600">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
              <p>{t("legacyWorkspaceClaimSafety")}</p>
            </div>
            <Button
              disabled={claiming || claim?.claimedByOtherUser || !claim?.canClaim}
              onClick={claimLegacyWorkspace}
              variant="primary"
            >
              {claiming ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <UserRound aria-hidden="true" className="h-4 w-4" />}
              {claiming ? t("claimingWorkspace") : t("claimThisWorkspace")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
