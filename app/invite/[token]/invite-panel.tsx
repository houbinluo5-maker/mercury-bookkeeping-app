"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AlertBanner } from "@/components/ui-primitives";
import { useI18n } from "@/lib/i18n";

type InvitationState = {
  invitation: {
    email: string;
    role: string;
    status: string;
  };
  isExpired: boolean;
  workspace: {
    name: string;
  } | null;
};

function roleLabel(t: (key: string) => string, role: string) {
  return t(`role.${role}`);
}

export function InvitePanel({ token }: { token: string }) {
  const { t } = useI18n();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<InvitationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvitation() {
      try {
        const response = await fetch(`/api/team/invitation/${encodeURIComponent(token)}`, {
          cache: "no-store"
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || t("invitationLoadError"));
        }

        if (!active) return;

        setInvitation(body as InvitationState);

        const accountResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (accountResponse.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t("invitationLoadError"));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInvitation();

    return () => {
      active = false;
    };
  }, [t, token]);

  async function acceptInvite() {
    setAccepting(true);
    setError("");

    try {
      const response = await fetch(`/api/team/invitation/${encodeURIComponent(token)}`, {
        method: "POST"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || t("invitationAcceptError"));
      }

      setSuccess(true);
      window.setTimeout(() => {
        window.location.href = "/team";
      }, 900);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : t("invitationAcceptError"));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <BrandLogo size="md" subtitle={t("brandSubtitle")} />
        </div>

        <section className="surface-card overflow-hidden">
          <div className="border-b border-line bg-marine/[0.03] p-6">
            <p className="text-xs font-semibold uppercase text-marine">{t("workspaceInvitation")}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">{t("joinWorkspace")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("joinWorkspaceDescription")}</p>
          </div>

          <div className="space-y-5 p-6">
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {t("loadingInvitation")}
              </div>
            ) : null}

            {error ? (
              <AlertBanner icon={<AlertCircle aria-hidden="true" className="h-5 w-5" />} tone="danger">
                <p className="text-sm font-semibold">{error}</p>
              </AlertBanner>
            ) : null}

            {success ? (
              <AlertBanner icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />} tone="success">
                <p className="text-sm font-semibold">{t("invitationAccepted")}</p>
              </AlertBanner>
            ) : null}

            {invitation ? (
              <div className="grid gap-3 rounded-lg border border-line bg-slate-50/70 p-4 text-sm">
                <div>
                  <p className="form-label">{t("activeWorkspace")}</p>
                  <p className="mt-1 font-semibold text-ink">{invitation.workspace?.name ?? "Mercury Books"}</p>
                </div>
                <div>
                  <p className="form-label">{t("invitedEmail")}</p>
                  <p className="mt-1 font-semibold text-ink">{invitation.invitation.email}</p>
                </div>
                <div>
                  <p className="form-label">{t("role")}</p>
                  <p className="mt-1 font-semibold text-ink">{roleLabel(t, invitation.invitation.role)}</p>
                </div>
              </div>
            ) : null}

            {invitation?.isExpired ? (
              <AlertBanner tone="warning">
                <p className="text-sm font-semibold">{t("invitationExpired")}</p>
              </AlertBanner>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                disabled={accepting || loading || !invitation || invitation.isExpired || invitation.invitation.status !== "invited"}
                onClick={acceptInvite}
                variant="primary"
              >
                {accepting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}
                {accepting ? t("acceptingInvitation") : t("acceptInvitation")}
              </Button>
              <Link className="flex-1" href="/login">
                <Button className="w-full">{t("backToLogin")}</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
