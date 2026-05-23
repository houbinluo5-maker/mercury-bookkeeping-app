import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { BookkeepingProvider } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Mercury Bookkeeping MVP",
  description: "Manual-entry bookkeeping for a US LLC ecommerce business"
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
