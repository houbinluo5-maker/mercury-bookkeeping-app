import type { Metadata } from "next";
import { ForgotPasswordPanel } from "@/components/auth-panels";

export const metadata: Metadata = {
  title: "Forgot password"
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  return (
    <ForgotPasswordPanel
      error={getParam(params, "error")}
      message={getParam(params, "message")}
      sent={getParam(params, "sent")}
    />
  );
}
