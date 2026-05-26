import { randomUUID } from "node:crypto";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isPublicSignupAllowed,
  isSupabaseAuthConfigured
} from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/supabase-server";
import type { UserProfile, Workspace, WorkspaceMember } from "@/lib/types";

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

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: metadata.full_name || metadata.name || user.email?.split("@")[0] || "",
    avatar_url: metadata.avatar_url || "",
    auth_provider: metadata.provider || user.app_metadata?.provider || "email",
    created_at: now,
    updated_at: now
  };
}

function workspaceNameFor(user: SupabaseAuthUser, requestedName?: string) {
  const fallback = user.email ? `${user.email.split("@")[0]} Workspace` : "Mercury Books Workspace";
  return requestedName?.trim() || fallback;
}

export async function ensureProfileAndWorkspace(user: SupabaseAuthUser, requestedWorkspaceName?: string) {
  const profile = profileFromUser(user);

  await adminRestRequest("profiles?on_conflict=id", {
    body: JSON.stringify(profile),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    method: "POST"
  });

  const memberships = await adminRestRequest<WorkspaceMember[]>(
    `workspace_members?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );

  if (memberships[0]) {
    const workspaces = await adminRestRequest<Workspace[]>(
      `workspaces?select=*&id=eq.${encodeURIComponent(memberships[0].workspace_id)}&limit=1`
    );

    if (workspaces[0]) {
      return { membership: memberships[0], workspace: workspaces[0] };
    }
  }

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

export async function getWorkspaceContextForUser(user: SupabaseAuthUser): Promise<AuthWorkspaceContext> {
  const { membership, workspace } = await ensureProfileAndWorkspace(user);

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
