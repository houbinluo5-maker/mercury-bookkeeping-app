import { isAdminPasswordConfigured, isSafeRedirectPath } from "@/lib/auth";
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
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <LoginPanel
      error={error}
      isDevelopment={isDevelopment}
      loggedOut={loggedOut}
      nextPath={nextPath}
      passwordConfigured={passwordConfigured}
      setup={setup}
    />
  );
}
