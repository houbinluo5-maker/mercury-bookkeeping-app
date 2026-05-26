"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MailPlus, ShieldCheck, UserMinus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { AlertBanner, SectionHeader } from "@/components/ui-primitives";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceInvitationStatus, WorkspaceMemberStatus, WorkspaceRole } from "@/lib/types";

type TeamMember = {
  accepted_at?: string | null;
  created_at: string;
  display_email: string;
  email?: string;
  id: string;
  normalized_email?: string;
  role: WorkspaceRole;
  status?: WorkspaceMemberStatus;
  user_id: string | null;
};

type TeamInvitation = {
  accepted_at: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  invite_url?: string;
  invited_by: string | null;
  normalized_email: string;
  role: "admin" | "viewer" | "cpa";
  status: WorkspaceInvitationStatus;
};

type TeamState = {
  access: {
    canInviteRoles: Array<"admin" | "viewer" | "cpa">;
    canManageMembers: boolean;
  };
  currentMemberId: string;
  invitations: TeamInvitation[];
  members: TeamMember[];
  workspace: {
    name: string;
  };
};

type TeamActionResponse = {
  email_delivery?: {
    message?: string;
    status: "sent" | "not_configured" | "failed";
  };
  error?: string;
};

async function fetchTeamState(t: (key: string) => string) {
  const response = await fetch("/api/team", { cache: "no-store" });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || t("teamLoadError"));
  }

  return body as TeamState;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(new Date(value));
}

function roleLabel(t: (key: string) => string, role: string) {
  return t(`role.${role}`);
}

function statusLabel(t: (key: string) => string, status: string) {
  return t(`memberStatus.${status}`);
}

function statusTone(status?: string): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "active" || status === "accepted") return "green";
  if (status === "invited") return "amber";
  if (status === "revoked" || status === "expired") return "red";
  return "neutral";
}

export default function TeamPage() {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "warning">("success");
  const [role, setRole] = useState<"admin" | "viewer" | "cpa">("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [team, setTeam] = useState<TeamState | null>(null);

  const loadTeam = useCallback(async () => {
    setTeam(await fetchTeamState(t));
  }, [t]);

  useEffect(() => {
    let active = true;

    fetchTeamState(t)
      .then((nextTeam) => {
        if (active) setTeam(nextTeam);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t("teamLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const roleOptions = useMemo(() => team?.access.canInviteRoles ?? [], [team]);
  const activeMembers = team?.members.filter((member) => (member.status ?? "active") === "active") ?? [];
  const canManageMembers = team?.access.canManageMembers ?? false;
  const currentMemberId = team?.currentMemberId ?? "";
  const pendingInvitations = team?.invitations.filter((invitation) => invitation.status === "invited") ?? [];

  async function postTeamAction(payload: Record<string, unknown>, successMessage: string) {
    setSubmitting(true);
    setError("");
    setMessage("");
    setMessageTone("success");

    try {
      const response = await fetch("/api/team", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const body = (await response.json()) as TeamActionResponse;

      if (!response.ok) {
        throw new Error(body.error || t("teamActionError"));
      }

      if (successMessage) setMessage(successMessage);
      await loadTeam();
      return body;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t("teamActionError"));
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await postTeamAction({ action: "invite", email, role }, "");
    if (!result) return;

    if (result.email_delivery?.status === "sent") {
      setMessage(t("invitationEmailSent"));
      setMessageTone("success");
    } else if (result.email_delivery?.status === "failed") {
      setMessage(t("invitationEmailFailedFallback"));
      setMessageTone("warning");
    } else {
      setMessage(t("invitationCreatedManualFallback"));
      setMessageTone("warning");
    }

    setEmail("");
  }

  async function copyInviteLink(invitation: TeamInvitation) {
    if (!invitation.invite_url) return;

    await navigator.clipboard.writeText(invitation.invite_url);
    setCopiedId(invitation.id);
    window.setTimeout(() => setCopiedId(""), 1800);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("teamPageDescription")}
        eyebrow={t("systemNav")}
        title={t("teamMembers")}
      />

      {message ? (
        <AlertBanner tone={messageTone}>
          <p className="text-sm font-semibold">{message}</p>
        </AlertBanner>
      ) : null}

      {error ? (
        <AlertBanner tone="danger">
          <p className="text-sm font-semibold">{error}</p>
        </AlertBanner>
      ) : null}

      <section className="surface-card p-5">
        <SectionHeader
          description={t("teamInviteDescription")}
          title={t("inviteTeamMember")}
        />
        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_12rem_auto]" onSubmit={inviteMember}>
          <label className="block space-y-2">
            <span className="form-label">{t("email")}</span>
            <input
              className="form-input"
              disabled={submitting || !roleOptions.length}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="cpa@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block space-y-2">
            <span className="form-label">{t("role")}</span>
            <select
              className="form-input"
              disabled={submitting || !roleOptions.length}
              onChange={(event) => setRole(event.target.value as "admin" | "viewer" | "cpa")}
              value={role}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {roleLabel(t, option)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button className="w-full md:w-auto" disabled={submitting || !roleOptions.length} type="submit" variant="primary">
              {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <MailPlus aria-hidden="true" className="h-4 w-4" />}
              {t("sendInvite")}
            </Button>
          </div>
        </form>
        {!roleOptions.length ? (
          <p className="mt-3 text-sm text-slate-500">{t("teamInviteNotAllowed")}</p>
        ) : null}
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-line p-5">
          <SectionHeader
            description={t("activeMembersDescription")}
            title={t("activeMembers")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("member")}</th>
                <th className="px-4 py-3">{t("role")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("acceptedDate")}</th>
                <th className="px-4 py-3 text-right">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    {t("loadingTeam")}
                  </td>
                </tr>
              ) : null}
              {!loading && !activeMembers.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    {t("noActiveMembers")}
                  </td>
                </tr>
              ) : null}
              {!loading && activeMembers.map((member) => {
                const isOwner = member.role === "owner";
                const isSelf = member.id === currentMemberId;
                const active = (member.status ?? "active") === "active";
                const canManage = canManageMembers && active && !isOwner;

                return (
                  <tr className="hover:bg-slate-50/70" key={member.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{member.display_email}</p>
                      {isSelf ? <p className="text-xs text-slate-500">{t("you")}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          className="form-input h-9 w-32"
                          disabled={submitting}
                          onChange={(event) =>
                            postTeamAction(
                              { action: "change_role", memberId: member.id, role: event.target.value },
                              t("memberRoleChanged")
                            )
                          }
                          value={member.role}
                        >
                          <option value="admin">{roleLabel(t, "admin")}</option>
                          <option value="viewer">{roleLabel(t, "viewer")}</option>
                          <option value="cpa">{roleLabel(t, "cpa")}</option>
                        </select>
                      ) : (
                        <span className="font-medium text-slate-700">{roleLabel(t, member.role)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(member.status ?? "active")}>
                        {statusLabel(t, member.status ?? "active")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(member.accepted_at ?? member.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <Button
                          disabled={submitting}
                          onClick={() => postTeamAction({ action: "remove_member", memberId: member.id }, t("memberRemoved"))}
                          variant="danger"
                        >
                          <UserMinus aria-hidden="true" className="h-4 w-4" />
                          {t("remove")}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-line p-5">
          <SectionHeader
            description={t("pendingInvitationsDescription")}
            title={t("pendingInvitations")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">{t("role")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("invitedDate")}</th>
                <th className="px-4 py-3">{t("acceptedDate")}</th>
                <th className="px-4 py-3 text-right">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {!pendingInvitations.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    {t("noPendingInvitations")}
                  </td>
                </tr>
              ) : null}
              {pendingInvitations.map((invitation) => (
                <tr className="hover:bg-slate-50/70" key={invitation.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{invitation.email}</p>
                    {invitation.invite_url ? (
                      <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{invitation.invite_url}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{roleLabel(t, invitation.role)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(invitation.status)}>{statusLabel(t, invitation.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invitation.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invitation.accepted_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button disabled={!invitation.invite_url} onClick={() => copyInviteLink(invitation)}>
                        <Copy aria-hidden="true" className="h-4 w-4" />
                        {copiedId === invitation.id ? t("copied") : t("copyInviteLink")}
                      </Button>
                      {team?.access.canManageMembers ? (
                        <Button
                          disabled={submitting}
                          onClick={() => postTeamAction({ action: "revoke_invitation", invitationId: invitation.id }, t("invitationRevoked"))}
                          variant="danger"
                        >
                          {t("revoke")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AlertBanner icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}>
        <p className="text-sm leading-6">{t("teamSecurityNote")}</p>
      </AlertBanner>
    </div>
  );
}
