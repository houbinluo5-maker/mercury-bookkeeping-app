"use client";

import Link from "next/link";
import { Chrome, Github, LockKeyhole, Mail, ShieldAlert, WalletCards } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LoginPanel({
  error,
  githubEnabled,
  googleEnabled,
  isDevelopment,
  loggedOut,
  message,
  microsoftEnabled,
  nextPath,
  passwordConfigured,
  setup,
  supabaseAuthConfigured
}: {
  error?: string;
  githubEnabled: boolean;
  googleEnabled: boolean;
  isDevelopment: boolean;
  loggedOut?: string;
  message?: string;
  microsoftEnabled: boolean;
  nextPath: string;
  passwordConfigured: boolean;
  supabaseAuthConfigured: boolean;
  setup?: string;
}) {
  const { t } = useI18n();
  const microsoftLabel = t("continueWithMicrosoft");

  return (
    <div className="min-h-screen bg-paper px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-white shadow-panel">
                <WalletCards aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Mercury Books</p>
                <p className="text-xs font-medium text-slate-500">{t("executiveFinanceOs")}</p>
              </div>
            </div>
            <h1 className="mt-10 max-w-lg text-5xl font-semibold leading-tight tracking-normal text-ink">
              {t("authHeroTitle")}
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              {t("authHeroSubtitle")}
            </p>
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              {[t("authPillarPrivate"), t("authPillarWorkspace"), t("authPillarCpa")].map((item) => (
                <div className="rounded-lg border border-line bg-white px-4 py-4 shadow-soft" key={item}>
                  <p className="text-sm font-semibold text-ink">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-panel sm:p-8">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
              <WalletCards aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Mercury Books</p>
              <p className="text-xs text-slate-500">{t("privateBookkeepingAccess")}</p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase text-mint">{t("secureWorkspaceAccess")}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">{t("signIn")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("authLoginSubtitle")}</p>

        {!passwordConfigured || setup === "missing" ? (
          <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isDevelopment ? t("adminSetupPrefixDev") : t("adminSetupPrefixDeploy")}
              {t("adminSetupText")}
            </p>
          </div>
        ) : null}

        {error === "invalid" ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            {t("passwordNotAccepted")}
          </div>
        ) : null}

        {error === "supabase" || error === "provider_disabled" || error === "supabase_config" ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            {message || t("authRequestFailed")}
          </div>
        ) : null}

        {loggedOut ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            {t("loggedOut")}
          </div>
        ) : null}

        <form action="/api/auth/login" className="mt-6 space-y-4" method="post">
          <input name="next" type="hidden" value={nextPath} />
          <label className="block space-y-1">
            <span className="form-label">{t("email")}</span>
            <input
              autoComplete="email"
              className="form-input"
              disabled={!supabaseAuthConfigured}
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="form-label">{t("password")}</span>
            <input
              autoComplete="current-password"
              className="form-input"
              disabled={!supabaseAuthConfigured}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!supabaseAuthConfigured}
            type="submit"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            {t("signIn")}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link className="font-medium text-marine hover:text-ink" href="/forgot-password">
            {t("forgotPassword")}
          </Link>
          <Link className="font-medium text-marine hover:text-ink" href={`/register?next=${encodeURIComponent(nextPath)}`}>
            {t("createAccount")}
          </Link>
        </div>

        {googleEnabled || githubEnabled || microsoftEnabled ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs font-medium text-slate-500">{t("orContinueWith")}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            {googleEnabled ? (
              <Link className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-50" href="/api/auth/oauth/google">
                <Chrome aria-hidden="true" className="h-4 w-4" />
                {t("continueWithGoogle")}
              </Link>
            ) : null}
            {githubEnabled ? (
              <Link className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-50" href="/api/auth/oauth/github">
                <Github aria-hidden="true" className="h-4 w-4" />
                {t("continueWithGithub")}
              </Link>
            ) : null}
            {microsoftEnabled ? (
              <Link className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-50" href="/api/auth/oauth/azure">
                <WalletCards aria-hidden="true" className="h-4 w-4" />
                {microsoftLabel}
              </Link>
            ) : null}
          </div>
        ) : null}

        <details className="mt-6 rounded-md border border-line bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">{t("legacyAdminFallback")}</summary>
          <form action="/api/auth/login" className="mt-4 space-y-3" method="post">
            <input name="legacy" type="hidden" value="1" />
            <input name="next" type="hidden" value={nextPath} />
            <label className="block space-y-1">
              <span className="form-label">{t("adminPassword")}</span>
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
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!passwordConfigured}
              type="submit"
            >
              <LockKeyhole aria-hidden="true" className="h-4 w-4" />
              {t("continueWithLegacyPassword")}
            </button>
          </form>
        </details>

        <p className="mt-5 text-xs leading-5 text-slate-500">{t("authNote")}</p>
        </section>
      </div>
    </div>
  );
}
