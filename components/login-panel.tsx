"use client";

import { LockKeyhole, ShieldAlert, WalletCards } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LoginPanel({
  error,
  isDevelopment,
  loggedOut,
  nextPath,
  passwordConfigured,
  setup
}: {
  error?: string;
  isDevelopment: boolean;
  loggedOut?: string;
  nextPath: string;
  passwordConfigured: boolean;
  setup?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Mercury Books</p>
            <p className="text-xs text-slate-500">{t("privateBookkeepingAccess")}</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-normal text-ink">{t("signIn")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("enterAdminPassword")}</p>

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

        {loggedOut ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            {t("loggedOut")}
          </div>
        ) : null}

        <form action="/api/auth/login" className="mt-6 space-y-4" method="post">
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
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!passwordConfigured}
            type="submit"
          >
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            {t("signIn")}
          </button>
        </form>

        <p className="mt-5 text-xs text-slate-500">{t("authNote")}</p>
      </div>
    </div>
  );
}
