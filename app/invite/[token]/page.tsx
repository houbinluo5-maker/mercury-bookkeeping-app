import type { Metadata } from "next";
import { InvitePanel } from "./invite-panel";

export const metadata: Metadata = {
  title: "Workspace invitation"
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return <InvitePanel token={token} />;
}
