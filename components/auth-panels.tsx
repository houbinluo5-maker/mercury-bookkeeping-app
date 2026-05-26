"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chrome, Loader2, Mail, WalletCards } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function AuthFrame({
  children,
  eyebrow,
  subtitle,
  title
}: {
  children: React.ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-panel sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Mercury Books</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase text-mint">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {children}
      </section>
    </div>
  );
}

export function RegisterPanel({
  error,
  googleEnabled,
  message,
  nextPath
}: {
  error?: string;
  googleEnabled: boolean;
  message?: string;
  nextPath: string;
}) {
  const { t } = useI18n();

  return (
    <AuthFrame eyebrow={t("secureWorkspaceAccess")} subtitle={t("privateBookkeepingWorkspace")} title={t("createAccount")}>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Create a private workspace for your LLC bookkeeping, receipts, close, and CPA exports.
      </p>
      {error ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error === "invite_only" ? "Registration is currently invite-only." : message || t("authRequestFailed")}
        </div>
      ) : null}
      <form action="/api/auth/register" className="mt-6 space-y-4" method="post">
        <input name="next" type="hidden" value={nextPath} />
        <label className="block space-y-1">
          <span className="form-label">Full name</span>
          <input autoComplete="name" className="form-input" name="fullName" required />
        </label>
        <label className="block space-y-1">
          <span className="form-label">{t("email")}</span>
          <input autoComplete="email" className="form-input" name="email" required type="email" />
        </label>
        <label className="block space-y-1">
          <span className="form-label">Company / workspace name</span>
          <input autoComplete="organization" className="form-input" name="workspaceName" required />
        </label>
        <label className="block space-y-1">
          <span className="form-label">{t("password")}</span>
          <input autoComplete="new-password" className="form-input" name="password" required type="password" />
        </label>
        <label className="block space-y-1">
          <span className="form-label">Confirm password</span>
          <input autoComplete="new-password" className="form-input" name="confirmPassword" required type="password" />
        </label>
        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink" type="submit">
          <Mail aria-hidden="true" className="h-4 w-4" />
          {t("createAccount")}
        </button>
      </form>
      {googleEnabled ? (
        <Link className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-slate-50" href="/api/auth/oauth/google">
          <Chrome aria-hidden="true" className="h-4 w-4" />
          {t("continueWithGoogle")}
        </Link>
      ) : null}
      <p className="mt-5 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-marine hover:text-ink" href={`/login?next=${encodeURIComponent(nextPath)}`}>
          {t("signIn")}
        </Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPasswordPanel({ error, message, sent }: { error?: string; message?: string; sent?: string }) {
  const { t } = useI18n();

  return (
    <AuthFrame eyebrow={t("secureWorkspaceAccess")} subtitle={t("privateBookkeepingWorkspace")} title={t("forgotPassword")}>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter your email and Supabase Auth will send a secure reset link.
      </p>
      {sent ? <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">Reset email sent.</div> : null}
      {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{message || t("authRequestFailed")}</div> : null}
      <form action="/api/auth/forgot-password" className="mt-6 space-y-4" method="post">
        <label className="block space-y-1">
          <span className="form-label">{t("email")}</span>
          <input autoComplete="email" className="form-input" name="email" required type="email" />
        </label>
        <button className="inline-flex h-10 w-full items-center justify-center rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink" type="submit">
          Send reset link
        </button>
      </form>
      <Link className="mt-5 inline-block text-sm font-semibold text-marine hover:text-ink" href="/login">
        Back to login
      </Link>
    </AuthFrame>
  );
}

export function ResetPasswordPanel() {
  const [status, setStatus] = useState("");
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

    setStatus(response.ok ? "Password updated. You can sign in now." : (await response.json()).error);
  }

  return (
    <AuthFrame eyebrow={t("secureWorkspaceAccess")} subtitle={t("privateBookkeepingWorkspace")} title="Reset password">
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1">
          <span className="form-label">New password</span>
          <input autoComplete="new-password" className="form-input" name="password" required type="password" />
        </label>
        <button className="inline-flex h-10 w-full items-center justify-center rounded-md border border-marine bg-marine px-3 text-sm font-semibold text-white transition hover:bg-ink" type="submit">
          Update password
        </button>
      </form>
      {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
    </AuthFrame>
  );
}

export function AuthCallbackPanel() {
  const tokenPayload = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return {
      access_token: params.get("access_token") ?? "",
      expires_in: Number(params.get("expires_in") ?? 3600),
      refresh_token: params.get("refresh_token") ?? "",
      token_type: params.get("token_type") ?? "bearer"
    };
  }, []);
  const [status, setStatus] = useState(
    tokenPayload?.access_token ? "Securing your session..." : "No Supabase session token was returned."
  );

  useEffect(() => {
    if (!tokenPayload?.access_token) {
      return;
    }

    fetch("/api/auth/session", {
      body: JSON.stringify(tokenPayload),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        window.location.href = "/";
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "OAuth sign-in failed.");
      });
  }, [tokenPayload]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-5 py-4 text-sm text-slate-700 shadow-panel">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-marine" />
        {status}
      </div>
    </div>
  );
}
