export const AUTH_COOKIE_NAME = "mercury_books_auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

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
