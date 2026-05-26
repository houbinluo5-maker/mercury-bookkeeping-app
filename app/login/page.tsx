import {
  isAdminPasswordConfigured,
  isAuthProviderEnabled,
  isSafeRedirectPath,
  isSupabaseAuthConfigured
} from "@/lib/auth";
import { LoginPanel } from "@/components/login-panel";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const passwordConfigured = isAdminPasswordConfigured();
  const nextParam = getParam(params, "next") ?? "/";
  const nextPath = isSafeRedirectPath(nextParam) ? nextParam : "/";
  const error = getParam(params, "error");
  const setup = getParam(params, "setup");
  const loggedOut = getParam(params, "logout");
  const message = getParam(params, "message");
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <LoginPanel
      error={error}
      googleEnabled={isAuthProviderEnabled("google")}
      githubEnabled={isAuthProviderEnabled("github")}
      isDevelopment={isDevelopment}
      loggedOut={loggedOut}
      message={message}
      microsoftEnabled={isAuthProviderEnabled("azure")}
      nextPath={nextPath}
      passwordConfigured={passwordConfigured}
      setup={setup}
      supabaseAuthConfigured={isSupabaseAuthConfigured()}
    />
  );
}
