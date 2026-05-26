import { randomUUID } from "node:crypto";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isPublicSignupAllowed,
  isSupabaseAuthConfigured
} from "@/lib/auth";
import { createAuditEntry } from "@/lib/audit";
import { getSupabaseConfig } from "@/lib/supabase-server";
import type { AuditLog, UserProfile, Workspace, WorkspaceMember } from "@/lib/types";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
    provider?: string;
  };
  app_metadata?: {
    provider?: string;
  };
};

export type SupabaseAuthSession = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  user: SupabaseAuthUser;
};

export type AuthWorkspaceContext = {
  authType: "supabase" | "legacy";
  user: SupabaseAuthUser | null;
  workspace: Workspace;
  membership: WorkspaceMember | null;
};

type SupabaseErrorBody = {
  error?: string;
  error_description?: string;
  message?: string;
};

const LEGACY_WORKSPACE_ID = "legacy-workspace";

export type LegacyWorkspaceClaimStatus = {
  canClaim: boolean;
  claimedByCurrentUser: boolean;
  claimedByOtherUser: boolean;
  dataSummary: {
    audit_logs: boolean;
    categories: boolean;
    company_settings: boolean;
    monthly_closings: boolean;
    receipts: boolean;
    transactions: boolean;
  };
  hasData: boolean;
  workspace: Workspace | null;
};

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function authHeaders(token?: string) {
  const anonKey = getPublicSupabaseAnonKey();

  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    "Content-Type": "application/json"
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function describeAuthError(status: number, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const errorBody = body as SupabaseErrorBody;
    return errorBody.error_description || errorBody.message || errorBody.error || `Supabase Auth failed with ${status}.`;
  }

  return typeof body === "string" && body ? body : `Supabase Auth failed with ${status}.`;
}

export function normalizeIdentityEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase();
}

async function supabaseAuthRequest<T>(path: string, init: RequestInit = {}, token?: string) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Supabase Auth public variables are not configured.");
  }

  const response = await fetch(`${normalizeUrl(getPublicSupabaseUrl())}/auth/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...authHeaders(token),
      ...(init.headers ?? {})
    }
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new Error(describeAuthError(response.status, body));
  }

  return body as T;
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
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new Error(describeAuthError(response.status, body));
  }

  return body as T;
}

export async function signInWithEmail(email: string, password: string) {
  return supabaseAuthRequest<SupabaseAuthSession>("token?grant_type=password", {
    body: JSON.stringify({ email, password }),
    method: "POST"
  });
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  return supabaseAuthRequest<SupabaseAuthSession>("signup", {
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName
      }
    }),
    method: "POST"
  });
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  await supabaseAuthRequest("recover", {
    body: JSON.stringify({
      email,
      redirect_to: redirectTo
    }),
    method: "POST"
  });
}

export async function updatePassword(accessToken: string, password: string) {
  return supabaseAuthRequest<SupabaseAuthUser>(
    "user",
    {
      body: JSON.stringify({ password }),
      method: "PUT"
    },
    accessToken
  );
}

export async function getUserFromAccessToken(accessToken: string) {
  return supabaseAuthRequest<SupabaseAuthUser>("user", { method: "GET" }, accessToken);
}

export async function hasOwnerWorkspace() {
  const rows = await adminRestRequest<WorkspaceMember[]>(
    "workspace_members?select=*&role=eq.owner&limit=1"
  );

  return rows.length > 0;
}

export async function canCreatePublicAccount() {
  return isPublicSignupAllowed() || !(await hasOwnerWorkspace());
}

function profileFromUser(user: SupabaseAuthUser): UserProfile {
  const now = new Date().toISOString();
  const metadata = user.user_metadata ?? {};
  const normalizedEmail = normalizeIdentityEmail(user.email);

  return {
    id: user.id,
    email: normalizedEmail,
    full_name: metadata.full_name || metadata.name || normalizedEmail.split("@")[0] || "",
    avatar_url: metadata.avatar_url || "",
    auth_provider: metadata.provider || user.app_metadata?.provider || "email",
    created_at: now,
    updated_at: now
  };
}

function workspaceNameFor(user: SupabaseAuthUser, requestedName?: string) {
  const normalizedEmail = normalizeIdentityEmail(user.email);
  const fallback = normalizedEmail ? `${normalizedEmail.split("@")[0]} Workspace` : "Mercury Books Workspace";
  return requestedName?.trim() || fallback;
}

async function upsertProfileForUser(user: SupabaseAuthUser) {
  const profile = profileFromUser(user);

  await adminRestRequest("profiles?on_conflict=id", {
    body: JSON.stringify(profile),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });

  return profile;
}

async function loadWorkspaceById(id: string) {
  const workspaces = await adminRestRequest<Workspace[]>(
    `workspaces?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );

  return workspaces[0] ?? null;
}

async function loadMembershipsForUser(userId: string) {
  return adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`
  );
}

async function resolveMembershipWorkspace(
  memberships: WorkspaceMember[],
  preferredWorkspaceId?: string
) {
  const orderedMemberships = [...memberships].sort((left, right) => {
    if (preferredWorkspaceId && left.workspace_id === preferredWorkspaceId) return -1;
    if (preferredWorkspaceId && right.workspace_id === preferredWorkspaceId) return 1;
    return left.created_at.localeCompare(right.created_at);
  });

  for (const membership of orderedMemberships) {
    const workspace = await loadWorkspaceById(membership.workspace_id);
    if (workspace) return { membership, workspace };
  }

  return null;
}

async function createLinkedMembership(
  user: SupabaseAuthUser,
  workspace: Workspace,
  role: WorkspaceMember["role"]
) {
  const now = new Date().toISOString();
  const membership: WorkspaceMember = {
    id: `wm-${randomUUID()}`,
    workspace_id: workspace.id,
    user_id: user.id,
    role,
    created_at: now
  };

  await adminRestRequest("workspace_members?on_conflict=workspace_id,user_id", {
    body: JSON.stringify(membership),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });

  return membership;
}

async function resolveWorkspaceOwnedByUser(user: SupabaseAuthUser) {
  const workspaces = await adminRestRequest<Workspace[]>(
    `workspaces?select=*&owner_user_id=eq.${encodeURIComponent(user.id)}&order=created_at.asc&limit=1`
  );

  if (!workspaces[0]) return null;

  return {
    membership: await createLinkedMembership(user, workspaces[0], "owner"),
    workspace: workspaces[0]
  };
}

async function resolveWorkspaceByNormalizedEmail(user: SupabaseAuthUser, normalizedEmail: string) {
  if (!normalizedEmail) return null;

  const profiles = await adminRestRequest<UserProfile[]>(
    `profiles?select=*&email=ilike.${encodeURIComponent(normalizedEmail)}`
  );
  const matchingProfiles = profiles.filter(
    (profile) => profile.id !== user.id && normalizeIdentityEmail(profile.email) === normalizedEmail
  );

  for (const profile of matchingProfiles) {
    const memberships = await loadMembershipsForUser(profile.id);
    const resolved = await resolveMembershipWorkspace(memberships);

    if (resolved) {
      return {
        membership: await createLinkedMembership(user, resolved.workspace, resolved.membership.role),
        workspace: resolved.workspace
      };
    }

    const ownedWorkspaces = await adminRestRequest<Workspace[]>(
      `workspaces?select=*&owner_user_id=eq.${encodeURIComponent(profile.id)}&order=created_at.asc&limit=1`
    );

    if (ownedWorkspaces[0]) {
      return {
        membership: await createLinkedMembership(user, ownedWorkspaces[0], "owner"),
        workspace: ownedWorkspaces[0]
      };
    }
  }

  return null;
}

export async function ensureProfileAndWorkspace(
  user: SupabaseAuthUser,
  requestedWorkspaceName?: string,
  preferredWorkspaceId?: string
) {
  const profile = await upsertProfileForUser(user);

  const memberships = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.asc`
  );
  const existingWorkspace = await resolveMembershipWorkspace(memberships, preferredWorkspaceId);

  if (existingWorkspace) return existingWorkspace;

  const ownedWorkspace = await resolveWorkspaceOwnedByUser(user);
  if (ownedWorkspace) return ownedWorkspace;

  const emailLinkedWorkspace = await resolveWorkspaceByNormalizedEmail(user, profile.email);
  if (emailLinkedWorkspace) return emailLinkedWorkspace;

  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: `ws-${randomUUID()}`,
    name: workspaceNameFor(user, requestedWorkspaceName),
    business_type: "US LLC",
    tax_year: new Date().getUTCFullYear(),
    default_currency: "USD",
    owner_user_id: user.id,
    created_at: now,
    updated_at: now
  };
  const membership: WorkspaceMember = {
    id: `wm-${randomUUID()}`,
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
    created_at: now
  };

  await adminRestRequest("workspaces?on_conflict=id", {
    body: JSON.stringify(workspace),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });
  await adminRestRequest("workspace_members?on_conflict=workspace_id,user_id", {
    body: JSON.stringify(membership),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });

  return { membership, workspace };
}

async function legacyWorkspaceHasRows(table: string) {
  try {
    const rows = await adminRestRequest<Array<Record<string, unknown>>>(
      `${table}?select=workspace_id&workspace_id=eq.${encodeURIComponent(LEGACY_WORKSPACE_ID)}&limit=1`
    );

    return rows.length > 0;
  } catch {
    return false;
  }
}

async function loadLegacyWorkspaceMembers() {
  return adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&workspace_id=eq.${encodeURIComponent(LEGACY_WORKSPACE_ID)}&order=created_at.asc`
  );
}

export async function getLegacyWorkspaceClaimStatus(
  user?: SupabaseAuthUser | null
): Promise<LegacyWorkspaceClaimStatus> {
  const workspace = await loadWorkspaceById(LEGACY_WORKSPACE_ID);
  const dataSummary = {
    audit_logs: await legacyWorkspaceHasRows("audit_logs"),
    categories: await legacyWorkspaceHasRows("categories"),
    company_settings: await legacyWorkspaceHasRows("company_settings"),
    monthly_closings: await legacyWorkspaceHasRows("monthly_closings"),
    receipts: await legacyWorkspaceHasRows("receipts"),
    transactions: await legacyWorkspaceHasRows("transactions")
  };
  const hasData = Object.values(dataSummary).some(Boolean);
  const members = workspace ? await loadLegacyWorkspaceMembers() : [];
  const ownerMember = members.find((member) => member.role === "owner");
  const currentUserId = user?.id ?? "";
  const claimedByCurrentUser = Boolean(
    currentUserId &&
      (workspace?.owner_user_id === currentUserId ||
        ownerMember?.user_id === currentUserId ||
        members.some((member) => member.user_id === currentUserId && member.role === "owner"))
  );
  const claimedByOtherUser = Boolean(
    (workspace?.owner_user_id && workspace.owner_user_id !== currentUserId) ||
      (ownerMember && ownerMember.user_id !== currentUserId)
  );

  return {
    canClaim: Boolean(workspace && user && hasData && !claimedByCurrentUser && !claimedByOtherUser),
    claimedByCurrentUser,
    claimedByOtherUser,
    dataSummary,
    hasData,
    workspace
  };
}

async function upsertLegacyOwnerMembership(user: SupabaseAuthUser) {
  const now = new Date().toISOString();
  const existingMembers = await loadLegacyWorkspaceMembers();
  const existing = existingMembers.find((member) => member.user_id === user.id);

  if (existing) {
    const updated = await adminRestRequest<WorkspaceMember[]>(
      `workspace_members?id=eq.${encodeURIComponent(existing.id)}`,
      {
        body: JSON.stringify({ role: "owner" }),
        headers: {
          Prefer: "return=representation"
        },
        method: "PATCH"
      }
    );

    return updated[0] ?? { ...existing, role: "owner" as const };
  }

  const membership: WorkspaceMember = {
    id: `wm-${randomUUID()}`,
    workspace_id: LEGACY_WORKSPACE_ID,
    user_id: user.id,
    role: "owner",
    created_at: now
  };

  await adminRestRequest("workspace_members?on_conflict=workspace_id,user_id", {
    body: JSON.stringify(membership),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });

  return membership;
}

async function appendWorkspaceClaimAuditLog(user: SupabaseAuthUser, workspace: Workspace) {
  const normalizedEmail = normalizeIdentityEmail(user.email);
  const now = new Date().toISOString();
  const auditLog: AuditLog = {
    ...createAuditEntry({
      action: "workspace_claimed",
      actor: normalizedEmail || "admin",
      created_at: now,
      entity_id: workspace.id,
      entity_type: "workspace",
      field_name: "owner_user_id",
      old_value: workspace.owner_user_id ?? "",
      new_value: user.id,
      reason: "legacy workspace claimed by authenticated owner",
      source: "manual"
    }),
    actor_email: normalizedEmail,
    actor_user_id: user.id,
    workspace_id: workspace.id
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

export async function claimLegacyWorkspace(user: SupabaseAuthUser) {
  const normalizedEmail = normalizeIdentityEmail(user.email);

  if (!normalizedEmail) {
    throw new Error("A verified email address is required to claim a legacy workspace.");
  }

  await upsertProfileForUser(user);

  const status = await getLegacyWorkspaceClaimStatus(user);

  if (!status.workspace) {
    throw new Error("Legacy workspace was not found.");
  }

  if (!status.hasData) {
    throw new Error("No legacy workspace data is available to claim.");
  }

  if (status.claimedByOtherUser) {
    throw new Error("This legacy workspace has already been claimed by another owner.");
  }

  const membership = await upsertLegacyOwnerMembership(user);
  const updatedWorkspaces = await adminRestRequest<Workspace[]>(
    `workspaces?id=eq.${encodeURIComponent(LEGACY_WORKSPACE_ID)}`,
    {
      body: JSON.stringify({
        owner_user_id: user.id,
        updated_at: new Date().toISOString()
      }),
      headers: {
        Prefer: "return=representation"
      },
      method: "PATCH"
    }
  );
  const workspace = updatedWorkspaces[0] ?? { ...status.workspace, owner_user_id: user.id };
  const auditLog = status.claimedByCurrentUser
    ? null
    : await appendWorkspaceClaimAuditLog(user, status.workspace);

  return {
    auditLog,
    membership,
    status: await getLegacyWorkspaceClaimStatus(user),
    workspace
  };
}

export async function getWorkspaceContextForUser(
  user: SupabaseAuthUser,
  preferredWorkspaceId?: string
): Promise<AuthWorkspaceContext> {
  const { membership, workspace } = await ensureProfileAndWorkspace(user, undefined, preferredWorkspaceId);

  return {
    authType: "supabase",
    membership,
    user,
    workspace
  };
}

export function legacyWorkspaceContext(): AuthWorkspaceContext {
  const now = new Date().toISOString();

  return {
    authType: "legacy",
    membership: {
      id: "legacy-admin-member",
      workspace_id: "legacy-workspace",
      user_id: "legacy-admin",
      role: "owner",
      created_at: now
    },
    user: null,
    workspace: {
      id: "legacy-workspace",
      name: "Legacy Mercury Books Workspace",
      business_type: "US LLC",
      tax_year: new Date().getUTCFullYear(),
      default_currency: "USD",
      owner_user_id: null,
      created_at: now,
      updated_at: now
    }
  };
}
