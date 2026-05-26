"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Github, Loader2, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useI18n } from "@/lib/i18n";

export const authInputClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-marine focus:ring-4 focus:ring-marine/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const primaryAuthButtonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-marine bg-marine px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-marine/15 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryAuthButtonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-marine/10";

function BenefitCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/60 bg-white/70 px-4 py-4 shadow-soft backdrop-blur">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

export function GoogleGIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.63-.06-1.24-.16-1.82H9v3.44h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.6Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.35 0-4.34-1.58-5.05-3.72H.93v2.33A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.95 10.68A5.41 5.41 0 0 1 3.67 9c0-.58.1-1.14.28-1.68V4.99H.93A9 9 0 0 0 0 9c0 1.45.34 2.82.93 4.01l3.02-2.33Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .93 4.99l3.02 2.33C4.66 5.17 6.65 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

export function MicrosoftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 18 18">
      <path d="M1 1h7.45v7.45H1V1Z" fill="#F25022" />
      <path d="M9.55 1H17v7.45H9.55V1Z" fill="#7FBA00" />
      <path d="M1 9.55h7.45V17H1V9.55Z" fill="#00A4EF" />
      <path d="M9.55 9.55H17V17H9.55V9.55Z" fill="#FFB900" />
    </svg>
  );
}

export function OAuthButton({
  children,
  href,
  icon
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link className={secondaryAuthButtonClass} href={href}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export function oauthProviderHref(provider: "google" | "github" | "azure", nextPath: string) {
  return `/api/auth/oauth/${provider}?next=${encodeURIComponent(nextPath || "/")}`;
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function AuthAlert({
  children,
  tone = "error"
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "warning" | "info";
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900"
  };

  return (
    <div className={`mt-5 rounded-lg border px-3.5 py-3 text-sm leading-6 ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function AuthLayout({
  children,
  description,
  eyebrow,
  title
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  const { t } = useI18n();
  const benefits = [
    [t("authBenefitControlLabel"), t("authBenefitControl")],
    [t("authBenefitCloseLabel"), t("authBenefitClose")],
    [t("authBenefitCpaLabel"), t("authBenefitCpa")]
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(245,243,239,0.72)_42%,rgba(232,239,237,0.68))]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,18,32,0.04)_1px,transparent_1px),linear-gradient(rgba(11,18,32,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <BrandLogo size="lg" subtitle={t("brandSubtitle")} />
            </div>
            <p className="mt-12 text-xs font-semibold uppercase text-mint">{eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-5xl font-semibold leading-tight tracking-normal text-ink">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">{description}</p>
            <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-slate-500">
              {t("brandWorkspaceSummary")}
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {benefits.map(([label, value]) => (
                <BenefitCard key={label} label={label} value={value} />
              ))}
            </div>
            <div className="mt-8 flex max-w-lg items-start gap-3 rounded-lg border border-marine/10 bg-white/60 px-4 py-4 text-sm leading-6 text-slate-600 shadow-soft backdrop-blur">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
              <p>{t("authTrustNote")}</p>
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[29rem]">
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <BrandLogo size="md" subtitle={t("brandSubtitle")} />
          </div>
          <div className="rounded-lg border border-white/70 bg-white/95 p-5 shadow-command ring-1 ring-slate-900/5 backdrop-blur sm:p-7">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthCardHeader({
  description,
  eyebrow,
  title
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-mint">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function RegisterPanel({
  error,
  githubEnabled,
  googleEnabled,
  message,
  microsoftEnabled,
  nextPath
}: {
  error?: string;
  githubEnabled: boolean;
  googleEnabled: boolean;
  message?: string;
  microsoftEnabled: boolean;
  nextPath: string;
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
        description={t("registerSubtitle")}
        eyebrow={t("authCreateWorkspace")}
        title={t("createAccount")}
      />
      {error ? (
        <AuthAlert>{error === "invite_only" ? t("authInviteOnly") : message || t("authRequestFailedFriendly")}</AuthAlert>
      ) : null}
      <form action="/api/auth/register" className="mt-6 space-y-4" method="post">
        <input name="next" type="hidden" value={nextPath} />
        <label className="block space-y-2">
          <span className="form-label">{t("fullName")}</span>
          <input autoComplete="name" className={authInputClass} name="fullName" required />
        </label>
        <label className="block space-y-2">
          <span className="form-label">{t("email")}</span>
          <input autoComplete="email" className={authInputClass} name="email" required type="email" />
        </label>
        <label className="block space-y-2">
          <span className="form-label">{t("workspaceName")}</span>
          <input autoComplete="organization" className={authInputClass} name="workspaceName" required />
        </label>
        <label className="block space-y-2">
          <span className="form-label">{t("password")}</span>
          <input autoComplete="new-password" className={authInputClass} name="password" required type="password" />
        </label>
        <label className="block space-y-2">
          <span className="form-label">{t("confirmPassword")}</span>
          <input autoComplete="new-password" className={authInputClass} name="confirmPassword" required type="password" />
        </label>
        <button className={primaryAuthButtonClass} type="submit">
          <Mail aria-hidden="true" className="h-4 w-4" />
          {t("createAccount")}
        </button>
      </form>
      {providersEnabled ? (
        <div className="mt-6 space-y-3">
          <AuthDivider label={t("orContinueWith")} />
          {googleEnabled ? (
            <OAuthButton href={oauthProviderHref("google", nextPath)} icon={<GoogleGIcon />}>
              {t("continueWithGoogle")}
            </OAuthButton>
          ) : null}
          {microsoftEnabled ? (
            <OAuthButton href={oauthProviderHref("azure", nextPath)} icon={<MicrosoftIcon />}>
              {t("continueWithMicrosoft")}
            </OAuthButton>
          ) : null}
          {githubEnabled ? (
            <OAuthButton href={oauthProviderHref("github", nextPath)} icon={<Github aria-hidden="true" className="h-4 w-4" />}>
              {t("continueWithGithub")}
            </OAuthButton>
          ) : null}
        </div>
      ) : null}
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("alreadyHaveAccount")}{" "}
        <Link className="font-semibold text-marine hover:text-ink" href={`/login?next=${encodeURIComponent(nextPath)}`}>
          {t("signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPanel({ error, message, sent }: { error?: string; message?: string; sent?: string }) {
  const { t } = useI18n();

  return (
    <AuthLayout
      description={t("authHeroSubtitlePremium")}
      eyebrow={t("secureWorkspaceAccess")}
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("forgotPasswordSubtitle")}
        eyebrow={t("accountRecovery")}
        title={t("forgotPassword")}
      />
      {sent ? <AuthAlert tone="success">{t("resetEmailSent")}</AuthAlert> : null}
      {error ? <AuthAlert>{message || t("authRequestFailedFriendly")}</AuthAlert> : null}
      <form action="/api/auth/forgot-password" className="mt-6 space-y-4" method="post">
        <label className="block space-y-2">
          <span className="form-label">{t("email")}</span>
          <input autoComplete="email" className={authInputClass} name="email" required type="email" />
        </label>
        <button className={primaryAuthButtonClass} type="submit">
          {t("sendResetLink")}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
      <Link className="mt-6 inline-flex text-sm font-semibold text-marine hover:text-ink" href="/login">
        {t("backToLogin")}
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPanel() {
  const [status, setStatus] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const { t } = useI18n();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const accessToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("access_token") ?? "";
    const response = await fetch("/api/auth/reset-password", {
      body: JSON.stringify({ accessToken, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    setStatus(
      response.ok
        ? { message: t("passwordUpdated"), tone: "success" }
        : { message: (await response.json()).error || t("authRequestFailedFriendly"), tone: "error" }
    );
  }

  return (
    <AuthLayout
      description={t("authHeroSubtitlePremium")}
      eyebrow={t("secureWorkspaceAccess")}
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("resetPasswordSubtitle")}
        eyebrow={t("accountRecovery")}
        title={t("resetPassword")}
      />
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="form-label">{t("newPassword")}</span>
          <input autoComplete="new-password" className={authInputClass} name="password" required type="password" />
        </label>
        <button className={primaryAuthButtonClass} type="submit">
          {t("updatePassword")}
        </button>
      </form>
      {status ? <AuthAlert tone={status.tone}>{status.message}</AuthAlert> : null}
      <Link className="mt-6 inline-flex text-sm font-semibold text-marine hover:text-ink" href="/login">
        {t("backToLogin")}
      </Link>
    </AuthLayout>
  );
}

export function AuthCallbackPanel() {
  const { t } = useI18n();
  const callbackState = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        errorMessage: "",
        code: "",
        nextPath: "/",
        tokenPayload: null
      };
    }

    const query = new URLSearchParams(window.location.search);
    const requestedNext = query.get("next") ?? "/";
    const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/login")
      ? requestedNext
      : "/";
    const errorMessage =
      query.get("error_description") || query.get("error") || query.get("message") || "";
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token") ?? "";

    return {
      code: query.get("code") ?? "",
      errorMessage,
      nextPath,
      tokenPayload: accessToken ? {
        access_token: accessToken,
        expires_in: Number(params.get("expires_in") ?? 3600),
        refresh_token: params.get("refresh_token") ?? "",
        token_type: params.get("token_type") ?? "bearer"
      } : null
    };
  }, []);
  const [status, setStatus] = useState<{ message: string; tone: "error" | "loading" }>(() => {
    if (callbackState.errorMessage) {
      return { message: callbackState.errorMessage, tone: "error" };
    }

    return callbackState.code || callbackState.tokenPayload?.access_token
      ? { message: t("securingSession"), tone: "loading" }
      : { message: t("oauthCallbackMissingSession"), tone: "error" };
  });

  useEffect(() => {
    if (callbackState.errorMessage) {
      return;
    }

    if (callbackState.code) {
      const url = new URL("/api/auth/callback", window.location.origin);
      url.searchParams.set("code", callbackState.code);
      url.searchParams.set("next", callbackState.nextPath);
      window.location.replace(url.toString());
      return;
    }

    if (!callbackState.tokenPayload?.access_token) {
      return;
    }

    fetch("/api/auth/session", {
      body: JSON.stringify(callbackState.tokenPayload),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        window.location.href = callbackState.nextPath;
      })
      .catch((error: unknown) => {
        setStatus({
          message: error instanceof Error ? error.message : t("oauthSignInFailed"),
          tone: "error"
        });
      });
  }, [callbackState, t]);

  return (
    <AuthLayout
      description={t("authHeroSubtitlePremium")}
      eyebrow={t("secureWorkspaceAccess")}
      title={t("authHeroTitlePremium")}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-marine">
          {status.tone === "loading" ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-coral" />
          )}
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-ink">
          {status.tone === "loading" ? t("finishingSignIn") : t("signInNeedsAttention")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{status.message}</p>
        {status.tone === "error" ? (
          <Link className={`${primaryAuthButtonClass} mt-6`} href={`/login?next=${encodeURIComponent(callbackState.nextPath)}`}>
            {t("backToLogin")}
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  );
}
