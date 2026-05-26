import type { Metadata } from "next";
import { AuthCallbackPanel } from "@/components/auth-panels";

export const metadata: Metadata = {
  title: "Signing in"
};

export default function AuthCallbackPage() {
  return <AuthCallbackPanel />;
}
