"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Github,
  Loader2,
  Mail,
  ShieldCheck
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { useI18n } from "@/lib/i18n";

export const authInputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const primaryAuthButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)] transition hover:-translate-y-px hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const secondaryAuthButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10";

const technicalAuthCopyPattern = /MVP|Supabase|HTTP-only|Cookie|cookies|ADMIN_PASSWORD|service role|service-role/i;

export function sanitizeAuthDetail(message?: string) {
  if (!message || technicalAuthCopyPattern.test(message)) {
    return "";
  }

  return message;
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

function AuthIllustration() {
  return (
    <div className="pointer-events-none relative mt-12 h-[19rem] w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-white/18 bg-white/10 p-6 shadow-[0_30px_90px_rgba(0,12,48,0.32)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="relative h-full rounded-[1.45rem] border border-white/18 bg-slate-950/16 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/45" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        </div>
        <div className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded-full bg-white/72" />
            <div className="h-3 w-44 rounded-full bg-white/28" />
            <div className="mt-6 flex h-28 items-end gap-3">
              <span className="h-12 flex-1 rounded-t-xl bg-cyan-300/70" />
              <span className="h-20 flex-1 rounded-t-xl bg-white/72" />
              <span className="h-16 flex-1 rounded-t-xl bg-cyan-100/62" />
              <span className="h-24 flex-1 rounded-t-xl bg-teal-300/72" />
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/16 bg-white/12 p-4">
            <div className="absolute inset-x-5 top-1/2 h-px bg-white/20" />
            <svg aria-hidden="true" className="relative h-full w-full" viewBox="0 0 180 120">
              <path d="M7 92 C35 72 45 84 70 54 C96 23 114 63 138 32 C151 15 164 22 174 14" fill="none" stroke="#67E8F9" strokeLinecap="round" strokeWidth="5" />
              <path d="M7 92 C35 72 45 84 70 54 C96 23 114 63 138 32 C151 15 164 22 174 14" fill="none" opacity="0.18" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="12" />
            </svg>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="h-14 rounded-2xl border border-white/14 bg-white/12" />
          <div className="h-14 rounded-2xl border border-white/14 bg-white/18" />
          <div className="h-14 rounded-2xl border border-white/14 bg-white/12" />
        </div>
      </div>
    </div>
  );
}

function AuthBluePanel({ description, title }: { description: string; title: string }) {
  const { t } = useI18n();

  return (
    <section className="relative flex min-h-[34vh] overflow-hidden bg-[radial-gradient(circle_at_28%_20%,rgba(103,232,249,0.36),transparent_28%),radial-gradient(circle_at_84%_82%,rgba(20,184,166,0.3),transparent_30%),linear-gradient(145deg,#0A2A8B_0%,#0B4FDB_48%,#06A7C6_100%)] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.72)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute -left-24 bottom-12 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-blue-950/30 blur-3xl" />
      <div className="relative z-10 flex w-full flex-col justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="shadow-[0_16px_40px_rgba(0,20,80,0.28)]" size="md" />
          <div>
            <p className="text-base font-semibold tracking-normal text-white">Mercury Books</p>
            <p className="text-xs font-medium text-cyan-100">{t("authBrandSubtitle")}</p>
          </div>
        </div>
        <div className="mt-12 max-w-xl lg:mt-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl lg:text-5xl xl:text-[3.45rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-blue-50/90 sm:text-base">{description}</p>
        </div>
        <div className="hidden lg:block">
          <AuthIllustration />
        </div>
      </div>
    </section>
  );
}

export function AuthLayout({
  children,
  description,
  title
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-white text-ink lg:grid lg:grid-cols-[42%_58%]">
      <AuthBluePanel description={description} title={title} />
      <section className="flex min-h-[66vh] items-center justify-center bg-[#FBFAF7] px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-[28rem]">
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthSecurityNote() {
  const { t } = useI18n();

  return (
    <div className="mt-5 flex w-full items-start gap-2.5 text-xs leading-5 text-slate-500">
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
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
      <p className="text-sm font-semibold text-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
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
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("authRegisterSubtitle")}
        eyebrow={t("authCreateWorkspace")}
        title={t("authRegisterTitle")}
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
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("authForgotSubtitle")}
        eyebrow={t("accountRecovery")}
        title={t("authForgotTitle")}
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
      title={t("authHeroTitlePremium")}
    >
      <AuthCardHeader
        description={t("authResetSubtitle")}
        eyebrow={t("accountRecovery")}
        title={t("authResetTitle")}
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

  const isError = status.tone === "error";
  const safeStatusMessage = sanitizeAuthDetail(status.message);

  return (
    <AuthLayout
      description={t("authHeroSubtitlePremium")}
      title={t("authHeroTitlePremium")}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm">
          {!isError ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-coral" />
          )}
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-slate-950">
          {!isError ? t("finishingSignIn") : t("signInNeedsAttention")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {!isError ? status.message : t("oauthCallbackFailed")}
        </p>
        {isError && safeStatusMessage ? (
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">{safeStatusMessage}</p>
        ) : null}
        {isError ? (
          <Link className={`${primaryAuthButtonClass} mt-6`} href={`/login?next=${encodeURIComponent(callbackState.nextPath)}`}>
            {t("backToLogin")}
          </Link>
        ) : null}
        <AuthSecurityNote />
      </div>
    </AuthLayout>
  );
}
