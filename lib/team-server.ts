import { randomBytes, randomUUID } from "node:crypto";
import { createAuditEntry } from "@/lib/audit";
import { sendWorkspaceInvitationEmail } from "@/lib/invite-email-server";
import { getSupabaseConfig } from "@/lib/supabase-server";
import {
  normalizeIdentityEmail,
  type AuthWorkspaceContext,
  type SupabaseAuthUser
} from "@/lib/supabase-auth-server";
import type {
  AuditAction,
  AuditLog,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole
} from "@/lib/types";

type SupabaseErrorBody = {
  error?: string;
  error_description?: string;
  message?: string;
};

export type TeamMemberView = WorkspaceMember & {
  display_email: string;
};

export type TeamInvitationView = Omit<WorkspaceInvitation, "token"> & {
  invite_url?: string;
};

type TeamAccess = {
  canInviteRoles: Array<"admin" | "viewer" | "cpa">;
  canManageMembers: boolean;
};

function parseResponseBody(text: string) {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function describeRestError(status: number, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const errorBody = body as SupabaseErrorBody;
    return errorBody.error_description || errorBody.message || errorBody.error || `Supabase request failed with ${status}.`;
  }

  return typeof body === "string" && body ? body : `Supabase request failed with ${status}.`;
}

async function adminRestRequest<T>(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const body = parseResponseBody(text);

  if (!response.ok) {
    throw new Error(describeRestError(response.status, body));
  }

  if (!text.trim()) return undefined as T;

  return body as T;
}

function requireAccountContext(auth: AuthWorkspaceContext) {
  if (auth.authType !== "supabase" || !auth.user || !auth.membership) {
    throw new Error("Account login is required for team management.");
  }

  if (auth.membership.status && auth.membership.status !== "active") {
    throw new Error("Only active workspace members can manage team access.");
  }

  return { membership: auth.membership, user: auth.user };
}

function accessForRole(role: WorkspaceRole): TeamAccess {
  if (role === "owner") {
    return {
      canInviteRoles: ["admin", "viewer", "cpa"],
      canManageMembers: true
    };
  }

  if (role === "admin") {
    return {
      canInviteRoles: ["viewer", "cpa"],
      canManageMembers: false
    };
  }

  return {
    canInviteRoles: [],
    canManageMembers: false
  };
}

function requireOwner(auth: AuthWorkspaceContext) {
  const { membership, user } = requireAccountContext(auth);

  if (membership.role !== "owner") {
    throw new Error("Only workspace owners can manage members.");
  }

  return { membership, user };
}

function roleLabel(role: WorkspaceRole) {
  if (role === "cpa") return "CPA";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function invitationExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);
  return expiresAt.toISOString();
}

function normalizeInvitationRole(value: string): "admin" | "viewer" | "cpa" {
  const role = value.trim().toLowerCase();

  if (role === "admin" || role === "viewer" || role === "cpa") return role;

  throw new Error("Choose Admin, Viewer, or CPA for an invitation.");
}

function inviteUrl(origin: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/invite/${encodeURIComponent(token)}`;
}

function publicInvitation(invitation: WorkspaceInvitation, origin?: string): TeamInvitationView {
  const { token, ...safe } = invitation;

  return {
    ...safe,
    invite_url: origin ? inviteUrl(origin, token) : undefined
  };
}

async function deliverTeamInvitationEmail(invitation: WorkspaceInvitation, workspace: Workspace, origin: string) {
  return sendWorkspaceInvitationEmail({
    expiresAt: invitation.expires_at,
    inviteUrl: inviteUrl(origin, invitation.token),
    roleLabel: roleLabel(invitation.role),
    to: invitation.email,
    workspaceName: workspace.name || "Mercury Books Workspace"
  });
}

async function appendTeamAuditLog({
  action,
  actor,
  entityId,
  fieldName,
  newValue,
  oldValue = "",
  reason,
  workspaceId
}: {
  action: AuditAction;
  actor: SupabaseAuthUser;
  entityId: string;
  fieldName: string;
  newValue: string;
  oldValue?: string;
  reason: string;
  workspaceId: string;
}) {
  const normalizedEmail = normalizeIdentityEmail(actor.email);
  const auditLog: AuditLog = {
    ...createAuditEntry({
      action,
      actor: normalizedEmail || "admin",
      entity_id: entityId,
      entity_type: "workspace",
      field_name: fieldName,
      new_value: newValue,
      old_value: oldValue,
      reason,
      source: "manual"
    }),
    actor_email: normalizedEmail,
    actor_user_id: actor.id,
    workspace_id: workspaceId
  };

  await adminRestRequest("audit_logs?on_conflict=id", {
    body: JSON.stringify(auditLog),
    headers: {
      Prefer: "resolution=ignore-duplicates,return=minimal"
    },
    method: "POST"
  });

  return auditLog;
}

async function loadMembers(workspaceId: string) {
  const members = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=created_at.asc`
  );

  return members.map((member) => ({
    ...member,
    display_email: member.email || member.normalized_email || member.user_id || "Unknown member",
    status: member.status ?? "active"
  }));
}

async function loadInvitations(workspaceId: string) {
  return adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=created_at.desc`
  );
}

export async function listTeam(auth: AuthWorkspaceContext, origin: string) {
  const { membership } = requireAccountContext(auth);
  const access = accessForRole(membership.role);
  const [members, invitations] = await Promise.all([
    loadMembers(auth.workspace.id),
    loadInvitations(auth.workspace.id)
  ]);

  return {
    access,
    currentMemberId: membership.id,
    invitations: invitations.map((invitation) => publicInvitation(invitation, origin)),
    members,
    workspace: auth.workspace
  };
}

async function assertNoActiveMember(workspaceId: string, normalizedEmail: string) {
  const members = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&normalized_email=eq.${encodeURIComponent(normalizedEmail)}`
  );

  if (members.some((member) => (member.status ?? "active") === "active")) {
    throw new Error("This email is already an active workspace member.");
  }
}

export async function createTeamInvitation(
  auth: AuthWorkspaceContext,
  email: string,
  roleValue: string,
  origin: string
) {
  const { membership, user } = requireAccountContext(auth);
  const access = accessForRole(membership.role);
  const role = normalizeInvitationRole(roleValue);
  const normalizedEmail = normalizeIdentityEmail(email);

  if (!access.canInviteRoles.includes(role)) {
    throw new Error("You do not have permission to invite that role.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  await assertNoActiveMember(auth.workspace.id, normalizedEmail);

  const existingInvitations = await adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?select=*&workspace_id=eq.${encodeURIComponent(auth.workspace.id)}&normalized_email=eq.${encodeURIComponent(normalizedEmail)}&status=eq.invited&limit=1`
  );
  const existingInvitation = existingInvitations[0];

  if (existingInvitation && new Date(existingInvitation.expires_at).getTime() > Date.now()) {
    return {
      email_delivery: await deliverTeamInvitationEmail(existingInvitation, auth.workspace, origin),
      invitation: publicInvitation(existingInvitation, origin),
      reused: true
    };
  }

  const now = new Date().toISOString();
  const invitation: WorkspaceInvitation = {
    accepted_at: null,
    accepted_by: null,
    created_at: now,
    email: normalizedEmail,
    expires_at: invitationExpiresAt(),
    id: `invite-${randomUUID()}`,
    invited_by: user.id,
    normalized_email: normalizedEmail,
    revoked_at: null,
    role,
    status: "invited",
    token: createInvitationToken(),
    updated_at: now,
    workspace_id: auth.workspace.id
  };

  const saved = await adminRestRequest<WorkspaceInvitation[]>("workspace_invitations?on_conflict=id", {
    body: JSON.stringify(invitation),
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    method: "POST"
  });
  const savedInvitation = saved[0] ?? invitation;

  await appendTeamAuditLog({
    action: "member_invited",
    actor: user,
    entityId: savedInvitation.id,
    fieldName: "workspace_invitation",
    newValue: JSON.stringify({ email: normalizedEmail, role }),
    reason: `Invited ${normalizedEmail} as ${roleLabel(role)}.`,
    workspaceId: auth.workspace.id
  });

  return {
    email_delivery: await deliverTeamInvitationEmail(savedInvitation, auth.workspace, origin),
    invitation: publicInvitation(savedInvitation, origin),
    reused: false
  };
}

async function loadInvitationById(workspaceId: string, id: string) {
  const invitations = await adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(id)}&limit=1`
  );

  return invitations[0] ?? null;
}

export async function revokeTeamInvitation(auth: AuthWorkspaceContext, invitationId: string) {
  const { user } = requireOwner(auth);
  const invitation = await loadInvitationById(auth.workspace.id, invitationId);

  if (!invitation) throw new Error("Invitation was not found.");
  if (invitation.status !== "invited") throw new Error("Only pending invitations can be revoked.");

  const now = new Date().toISOString();
  const updated = await adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?id=eq.${encodeURIComponent(invitation.id)}`,
    {
      body: JSON.stringify({
        revoked_at: now,
        status: "revoked",
        updated_at: now
      }),
      headers: {
        Prefer: "return=representation"
      },
      method: "PATCH"
    }
  );

  await appendTeamAuditLog({
    action: "invitation_revoked",
    actor: user,
    entityId: invitation.id,
    fieldName: "workspace_invitation",
    newValue: JSON.stringify({ email: invitation.normalized_email, status: "revoked" }),
    oldValue: "invited",
    reason: `Revoked invitation for ${invitation.normalized_email}.`,
    workspaceId: auth.workspace.id
  });

  return publicInvitation(updated[0] ?? { ...invitation, status: "revoked", revoked_at: now, updated_at: now });
}

async function loadMemberById(workspaceId: string, memberId: string) {
  const members = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(memberId)}&limit=1`
  );

  return members[0] ?? null;
}

export async function removeTeamMember(auth: AuthWorkspaceContext, memberId: string) {
  const { membership, user } = requireOwner(auth);
  const member = await loadMemberById(auth.workspace.id, memberId);

  if (!member) throw new Error("Member was not found.");
  if (member.role === "owner") throw new Error("Owner removal is out of scope for this phase.");
  if (member.id === membership.id || member.user_id === user.id) throw new Error("You cannot remove yourself.");

  const now = new Date().toISOString();
  const updated = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?id=eq.${encodeURIComponent(member.id)}`,
    {
      body: JSON.stringify({
        status: "revoked",
        updated_at: now
      }),
      headers: {
        Prefer: "return=representation"
      },
      method: "PATCH"
    }
  );

  await appendTeamAuditLog({
    action: "member_removed",
    actor: user,
    entityId: member.id,
    fieldName: "workspace_member",
    newValue: JSON.stringify({ email: member.normalized_email || member.email, status: "revoked" }),
    oldValue: member.status ?? "active",
    reason: `Removed ${member.normalized_email || member.email || "workspace member"}.`,
    workspaceId: auth.workspace.id
  });

  return updated[0] ?? { ...member, status: "revoked", updated_at: now };
}

export async function changeTeamMemberRole(
  auth: AuthWorkspaceContext,
  memberId: string,
  roleValue: string
) {
  const { user } = requireOwner(auth);
  const role = normalizeInvitationRole(roleValue);
  const member = await loadMemberById(auth.workspace.id, memberId);

  if (!member) throw new Error("Member was not found.");
  if (member.role === "owner") throw new Error("Owner role changes are out of scope for this phase.");
  if ((member.status ?? "active") !== "active") throw new Error("Only active members can change roles.");

  const now = new Date().toISOString();
  const updated = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?id=eq.${encodeURIComponent(member.id)}`,
    {
      body: JSON.stringify({
        role,
        updated_at: now
      }),
      headers: {
        Prefer: "return=representation"
      },
      method: "PATCH"
    }
  );

  await appendTeamAuditLog({
    action: "member_role_changed",
    actor: user,
    entityId: member.id,
    fieldName: "role",
    newValue: role,
    oldValue: member.role,
    reason: `Changed member role to ${roleLabel(role)}.`,
    workspaceId: auth.workspace.id
  });

  return updated[0] ?? { ...member, role, updated_at: now };
}

async function loadInvitationByToken(token: string) {
  const invitations = await adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?select=*&token=eq.${encodeURIComponent(token)}&limit=1`
  );

  return invitations[0] ?? null;
}

async function loadWorkspaceById(workspaceId: string) {
  const workspaces = await adminRestRequest<Workspace[]>(
    `workspaces?select=*&id=eq.${encodeURIComponent(workspaceId)}&limit=1`
  );

  return workspaces[0] ?? null;
}

function invitationIsExpired(invitation: WorkspaceInvitation) {
  return new Date(invitation.expires_at).getTime() <= Date.now();
}

export async function getInvitationForToken(token: string) {
  const invitation = await loadInvitationByToken(token);

  if (!invitation) return null;

  const workspace = await loadWorkspaceById(invitation.workspace_id);

  return {
    invitation: publicInvitation(invitation),
    isExpired: invitationIsExpired(invitation),
    workspace
  };
}

async function upsertAcceptedMembership(user: SupabaseAuthUser, invitation: WorkspaceInvitation) {
  const normalizedEmail = normalizeIdentityEmail(user.email);
  const now = new Date().toISOString();
  const existingMembers = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&workspace_id=eq.${encodeURIComponent(invitation.workspace_id)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  const existing = existingMembers[0];

  if (existing) {
    const updated = await adminRestRequest<WorkspaceMember[]>(
      `workspace_members?id=eq.${encodeURIComponent(existing.id)}`,
      {
        body: JSON.stringify({
          accepted_at: existing.accepted_at ?? now,
          email: normalizedEmail,
          normalized_email: normalizedEmail,
          role: invitation.role,
          status: "active",
          updated_at: now
        }),
        headers: {
          Prefer: "return=representation"
        },
        method: "PATCH"
      }
    );

    return updated[0] ?? existing;
  }

  const member: WorkspaceMember = {
    accepted_at: now,
    created_at: now,
    email: normalizedEmail,
    id: `wm-${randomUUID()}`,
    invited_at: invitation.created_at,
    invited_by: invitation.invited_by,
    normalized_email: normalizedEmail,
    role: invitation.role,
    status: "active",
    updated_at: now,
    user_id: user.id,
    workspace_id: invitation.workspace_id
  };

  const inserted = await adminRestRequest<WorkspaceMember[]>("workspace_members?on_conflict=workspace_id,user_id", {
    body: JSON.stringify(member),
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    method: "POST"
  });

  return inserted[0] ?? member;
}

export async function acceptInvitation(token: string, auth: AuthWorkspaceContext) {
  const { user } = requireAccountContext(auth);
  const invitation = await loadInvitationByToken(token);

  if (!invitation) throw new Error("Invitation was not found.");
  if (invitation.status !== "invited") throw new Error("This invitation is no longer active.");
  if (invitationIsExpired(invitation)) throw new Error("This invitation has expired.");

  const normalizedEmail = normalizeIdentityEmail(user.email);

  if (!normalizedEmail || normalizedEmail !== invitation.normalized_email) {
    throw new Error("This invitation belongs to a different email address.");
  }

  const now = new Date().toISOString();
  const membership = await upsertAcceptedMembership(user, invitation);
  const updatedInvitations = await adminRestRequest<WorkspaceInvitation[]>(
    `workspace_invitations?id=eq.${encodeURIComponent(invitation.id)}`,
    {
      body: JSON.stringify({
        accepted_at: now,
        accepted_by: user.id,
        status: "accepted",
        updated_at: now
      }),
      headers: {
        Prefer: "return=representation"
      },
      method: "PATCH"
    }
  );

  await appendTeamAuditLog({
    action: "invitation_accepted",
    actor: user,
    entityId: invitation.id,
    fieldName: "workspace_invitation",
    newValue: JSON.stringify({ email: normalizedEmail, role: invitation.role, status: "accepted" }),
    oldValue: "invited",
    reason: `Accepted workspace invitation for ${normalizedEmail}.`,
    workspaceId: invitation.workspace_id
  });

  return {
    invitation: publicInvitation(updatedInvitations[0] ?? { ...invitation, accepted_at: now, accepted_by: user.id, status: "accepted", updated_at: now }),
    membership,
    workspace: await loadWorkspaceById(invitation.workspace_id)
  };
}
