import { LockKeyhole, ShieldAlert, WalletCards } from "lucide-react";
import { isAdminPasswordConfigured, isSafeRedirectPath } from "@/lib/auth";

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
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Mercury Books</p>
            <p className="text-xs text-slate-500">Private bookkeeping access</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-normal text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the admin password to access bookkeeping data and reports.
        </p>

        {!passwordConfigured || setup === "missing" ? (
          <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isDevelopment ? "Development setup warning: " : "Deployment setup required: "}
              set <span className="font-semibold">ADMIN_PASSWORD</span> in your environment and
              restart the app before signing in.
            </p>
          </div>
        ) : null}

        {error === "invalid" ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            Password was not accepted.
          </div>
        ) : null}

        {loggedOut ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            You have been logged out.
          </div>
        ) : null}

        <form action="/api/auth/login" className="mt-6 space-y-4" method="post">
          <input name="next" type="hidden" value={nextPath} />
          <label className="block space-y-1">
            <span className="form-label">Admin Password</span>
            <input
              autoComplete="current-password"
              className="form-input"
              disabled={!passwordConfigured}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!passwordConfigured}
            type="submit"
          >
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            Sign in
          </button>
        </form>

        <p className="mt-5 text-xs text-slate-500">
          MVP auth uses an HTTP-only session cookie. Supabase auth is intentionally not enabled yet.
        </p>
      </div>
    </div>
  );
}
