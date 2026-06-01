"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  Github,
  KeyRound,
  Loader2,
  Mail,
  ReceiptText,
  ShieldCheck
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useI18n } from "@/lib/i18n";

export const authInputClass =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-mint focus:ring-4 focus:ring-mint/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const primaryAuthButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 text-sm font-semibold text-white shadow-command transition hover:-translate-y-px hover:bg-marine focus:outline-none focus:ring-4 focus:ring-marine/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const secondaryAuthButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-marine/10";

const benefitIcons = [KeyRound, ClipboardCheck, FileCheck2, ShieldCheck] as const;

function BenefitCard({ index, label, value }: { index: number; label: string; value: string }) {
  const Icon = benefitIcons[index % benefitIcons.length];

  return (
    <div className="group rounded-2xl border border-white/70 bg-white/75 p-4 shadow-soft ring-1 ring-slate-900/[0.03] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-mint/20 bg-mint/10 text-mint">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{value}</span>
        </span>
      </div>
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
    <a className={secondaryAuthButtonClass} href={href}>
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span>{children}</span>
    </a>
  );
}

export function oauthProviderHref(provider: "google" | "github" | "azure", nextPath: string) {
  return `/api/auth/oauth/${provider}?next=${encodeURIComponent(nextPath || "/")}`;
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />
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
    error: "border-red-200/80 bg-red-50/80 text-red-800",
    info: "border-blue-200/80 bg-blue-50/80 text-blue-900",
    success: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
    warning: "border-amber-200/80 bg-amber-50/80 text-amber-900"
  };

  return (
    <div className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 shadow-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}

function FinancePreview() {
  const { t } = useI18n();
  const rows = [
    { label: t("authPreviewClose"), value: "92%", tone: "text-emerald-700", width: "w-[92%]" },
    { label: t("authPreviewReceipts"), value: "3", tone: "text-amber-700", width: "w-[42%]" },
    { label: t("authPreviewCpa"), value: t("ready"), tone: "text-mint", width: "w-[82%]" },
    { label: t("authPreviewAudit"), value: t("protected"), tone: "text-slate-700", width: "w-[74%]" }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-command ring-1 ring-slate-900/[0.04] backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ink via-mint to-transparent" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("authPreviewEyebrow")}
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">{t("authPreviewTitle")}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-mint/20 bg-mint/10 text-mint">
          <BarChart3 aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-slate-600">{row.label}</span>
              <span className={`font-semibold ${row.tone}`}>{row.value}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-gradient-to-r from-ink to-mint ${row.width}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-600">
        <ReceiptText aria-hidden="true" className="h-4 w-4 text-mint" />
        {t("authPreviewFooter")}
      </div>
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
    [t("authBenefitCpaLabel"), t("authBenefitCpa")],
    [t("authBenefitAuditLabel"), t("authBenefitAudit")]
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F4ED] text-ink">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_74%_32%,rgba(31,122,109,0.16),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(16,42,67,0.12),transparent_32%),linear-gradient(135deg,#FBFAF7_0%,#F4F1EA_48%,#EDF4F1_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.42] [background-image:linear-gradient(rgba(10,16,32,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(10,16,32,0.05)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute left-1/2 top-12 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />
      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <aside className="hidden lg:block">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-2xl border border-white/70 bg-white/70 p-3 shadow-soft ring-1 ring-slate-900/[0.03] backdrop-blur">
              <BrandLogo size="lg" subtitle={t("brandSubtitleAuth")} />
            </div>
            <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-mint">{eyebrow}</p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-normal text-ink xl:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700">{description}</p>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
              {t("authHeroSupportLine")}
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              {benefits.map(([label, value], index) => (
                <BenefitCard key={label} index={index} label={label} value={value} />
              ))}
            </div>
            <div className="mt-8 grid max-w-2xl gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="flex items-start gap-3 rounded-2xl border border-marine/10 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600 shadow-soft backdrop-blur">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                <p>{t("authTrustNote")}</p>
              </div>
              <FinancePreview />
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[31rem]">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-soft">
              <BrandLogo size="md" subtitle={t("brandSubtitleAuth")} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-command ring-1 ring-slate-900/[0.05] backdrop-blur-xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ink via-mint to-transparent" />
            <div className="absolute right-8 top-0 h-24 w-24 rounded-full bg-mint/10 blur-2xl" />
            <div className="relative">
              {children}
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-xs leading-5 text-slate-600 shadow-soft backdrop-blur lg:hidden">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            <p>{t("authTrustNote")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthSecurityNote() {
  const { t } = useI18n();

  return (
    <div className="mt-5 flex w-full items-start gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-xs leading-5 text-slate-500">
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
      <p>{t("authNote")}</p>
    </div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">{eyebrow}</p>
      <h2 className="mt-3 text-[1.7rem] font-semibold tracking-normal text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
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
      <AuthSecurityNote />
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
      <AuthSecurityNote />
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
      <AuthSecurityNote />
    </AuthLayout>
  );
}

export function AuthCallbackPanel() {
  const { t } = useI18n();
  const callbackState = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        errorMessage: "",
        errorCode: "",
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
    const errorMessage = query.get("message") || query.get("error_description") || "";
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token") ?? "";

    return {
      code: query.get("code") ?? "",
      errorCode: query.get("error") ?? "",
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

    if (callbackState.errorCode) {
      return { message: t("oauthCallbackFailed"), tone: "error" };
    }

    return callbackState.code || callbackState.tokenPayload?.access_token
      ? { message: t("securingSession"), tone: "loading" }
      : { message: t("oauthCallbackMissingSession"), tone: "error" };
  });

  useEffect(() => {
    if (callbackState.errorMessage || callbackState.errorCode) {
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
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-coral" />
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
        <AuthSecurityNote />
      </div>
    </AuthLayout>
  );
}
