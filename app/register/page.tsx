import { RegisterPanel } from "@/components/auth-panels";
import { isAuthProviderEnabled, isSafeRedirectPath } from "@/lib/auth";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const nextParam = getParam(params, "next") ?? "/";

  return (
    <RegisterPanel
      error={getParam(params, "error")}
      githubEnabled={isAuthProviderEnabled("github")}
      googleEnabled={isAuthProviderEnabled("google")}
      message={getParam(params, "message")}
      microsoftEnabled={isAuthProviderEnabled("azure")}
      nextPath={isSafeRedirectPath(nextParam) ? nextParam : "/"}
    />
  );
}
