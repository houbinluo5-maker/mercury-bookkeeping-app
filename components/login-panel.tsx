"use client";

import Link from "next/link";
import { Github, LockKeyhole, Mail, ShieldAlert } from "lucide-react";
import {
  AuthAlert,
  AuthCardHeader,
  AuthDivider,
  AuthLayout,
  GoogleGIcon,
  MicrosoftIcon,
  OAuthButton,
  authInputClass,
  primaryAuthButtonClass,
  secondaryAuthButtonClass
} from "@/components/auth-panels";
import { useI18n } from "@/lib/i18n";

function friendlyLoginError(error: string | undefined, message: string | undefined, t: (key: string) => string) {
  if (error === "invalid") return t("passwordNotAccepted");
  if (error === "provider_disabled") return t("authProviderDisabled");
  if (error === "supabase_config") return t("authSupabaseConfigMissing");
  if (error === "supabase") return message || t("authRequestFailedFriendly");
  return message || t("authRequestFailedFriendly");
}

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
  const providersEnabled = googleEnabled || githubEnabled || microsoftEnabled;

  return (
    <AuthLayout
      description={t("authHeroSubtitlePremium")}
      eyebrow={t("secureWorkspaceAccess")}
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("authLoginSubtitlePremium")}
        eyebrow={t("authSignInEyebrow")}
        title={t("signIn")}
      />

      {!passwordConfigured || setup === "missing" ? (
        <AuthAlert tone="warning">
          <span className="flex gap-3">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {isDevelopment ? t("adminSetupPrefixDev") : t("adminSetupPrefixDeploy")}
              {t("adminSetupText")}
            </span>
          </span>
        </AuthAlert>
      ) : null}

      {error ? <AuthAlert>{friendlyLoginError(error, message, t)}</AuthAlert> : null}

      {loggedOut ? <AuthAlert tone="success">{t("loggedOut")}</AuthAlert> : null}

      <form action="/api/auth/login" className="mt-6 space-y-4" method="post">
        <input name="next" type="hidden" value={nextPath} />
        <label className="block space-y-2">
          <span className="form-label">{t("email")}</span>
          <input
            autoComplete="email"
            className={authInputClass}
            disabled={!supabaseAuthConfigured}
            name="email"
            required
            type="email"
          />
        </label>
        <label className="block space-y-2">
          <span className="form-label">{t("password")}</span>
          <input
            autoComplete="current-password"
            className={authInputClass}
            disabled={!supabaseAuthConfigured}
            name="password"
            required
            type="password"
          />
        </label>
        <button className={primaryAuthButtonClass} disabled={!supabaseAuthConfigured} type="submit">
          <Mail aria-hidden="true" className="h-4 w-4" />
          {t("signIn")}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <Link className="font-semibold text-marine hover:text-ink" href="/forgot-password">
          {t("forgotPassword")}
        </Link>
        <Link className="font-semibold text-marine hover:text-ink" href={`/register?next=${encodeURIComponent(nextPath)}`}>
          {t("createAccount")}
        </Link>
      </div>

      {providersEnabled ? (
        <div className="mt-6 space-y-3">
          <AuthDivider label={t("orContinueWith")} />
          {googleEnabled ? (
            <OAuthButton href="/api/auth/oauth/google" icon={<GoogleGIcon />}>
              {t("continueWithGoogle")}
            </OAuthButton>
          ) : null}
          {microsoftEnabled ? (
            <OAuthButton href="/api/auth/oauth/azure" icon={<MicrosoftIcon />}>
              {t("continueWithMicrosoft")}
            </OAuthButton>
          ) : null}
          {githubEnabled ? (
            <OAuthButton href="/api/auth/oauth/github" icon={<Github aria-hidden="true" className="h-4 w-4" />}>
              {t("continueWithGithub")}
            </OAuthButton>
          ) : null}
        </div>
      ) : null}

      <details className="mt-6 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-slate-600">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          {t("legacyAdminFallback")}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("legacyAdminFallbackHelp")}</p>
        <form action="/api/auth/login" className="mt-4 space-y-3" method="post">
          <input name="legacy" type="hidden" value="1" />
          <input name="next" type="hidden" value={nextPath} />
          <label className="block space-y-2">
            <span className="form-label">{t("adminPassword")}</span>
            <input
              autoComplete="current-password"
              className={authInputClass}
              disabled={!passwordConfigured}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className={secondaryAuthButtonClass}
            disabled={!passwordConfigured}
            type="submit"
          >
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            {t("continueWithLegacyPassword")}
          </button>
        </form>
      </details>

      <p className="mt-5 text-xs leading-5 text-slate-500">{t("authNote")}</p>
    </AuthLayout>
  );
}
