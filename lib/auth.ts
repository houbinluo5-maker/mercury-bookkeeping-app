export const AUTH_COOKIE_NAME = "mercury_books_auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;
export const SUPABASE_ACCESS_TOKEN_COOKIE = "mercury_sb_access_token";
export const SUPABASE_REFRESH_TOKEN_COOKIE = "mercury_sb_refresh_token";
export const ACTIVE_WORKSPACE_COOKIE = "mercury_active_workspace";
export const SUPABASE_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const AUTH_TOKEN_PREFIX = "mercury-bookkeeping-admin:";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function isAdminPasswordConfigured() {
  return getAdminPassword().length > 0;
}

export async function createAuthToken(password: string) {
  const data = new TextEncoder().encode(`${AUTH_TOKEN_PREFIX}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedAuthToken() {
  const password = getAdminPassword();

  if (!password) return "";

  return createAuthToken(password);
}

export function isSafeRedirectPath(path: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login"));
}

export function getPublicSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
}

export function getPublicSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function isSupabaseAuthConfigured() {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabaseAnonKey());
}

export function isPublicSignupAllowed() {
  return process.env.ALLOW_PUBLIC_SIGNUP === "true";
}

export function isAuthProviderEnabled(provider: "google" | "github" | "azure") {
  if (provider === "google") return process.env.ENABLE_GOOGLE_LOGIN === "true";
  if (provider === "github") return process.env.ENABLE_GITHUB_LOGIN === "true";
  return process.env.ENABLE_MICROSOFT_LOGIN === "true";
}
