import type { Metadata } from "next";
import { ResetPasswordPanel } from "@/components/auth-panels";

export const metadata: Metadata = {
  title: "Reset password"
};

export default function ResetPasswordPage() {
  return <ResetPasswordPanel />;
}
