import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { BookkeepingProvider } from "@/lib/storage";

export const metadata: Metadata = {
  applicationName: "Mercury Books",
  description:
    "Private finance operations workspace for ecommerce bookkeeping, receipts, reconciliation, monthly close, and CPA handoff.",
  icons: {
    apple: [{ sizes: "180x180", type: "image/png", url: "/apple-icon" }],
    icon: [{ sizes: "32x32", type: "image/png", url: "/icon" }]
  },
  title: {
    default: "Mercury Books | Executive Finance OS",
    template: "%s | Mercury Books"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BookkeepingProvider>
          <AppShell>{children}</AppShell>
        </BookkeepingProvider>
      </body>
    </html>
  );
}
