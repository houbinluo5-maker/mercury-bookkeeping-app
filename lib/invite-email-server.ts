export type InvitationEmailDelivery =
  | { status: "sent"; message: string }
  | { status: "not_configured"; message: string }
  | { status: "failed"; message: string; error: string };

type SendInvitationEmailInput = {
  expiresAt: string;
  inviteUrl: string;
  roleLabel: string;
  to: string;
  workspaceName: string;
};

type ResendErrorBody = {
  error?: string;
  message?: string;
  name?: string;
};

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

function getInviteEmailFrom() {
  return process.env.INVITE_EMAIL_FROM?.trim() ?? "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExpiration(expiresAt: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(expiresAt));
}

function parseResendError(body: unknown) {
  if (typeof body === "object" && body !== null) {
    const errorBody = body as ResendErrorBody;
    return errorBody.message || errorBody.error || errorBody.name || "Resend rejected the invitation email.";
  }

  return typeof body === "string" && body ? body : "Resend rejected the invitation email.";
}

async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function isInvitationEmailConfigured() {
  return Boolean(getResendApiKey() && getInviteEmailFrom());
}

export async function sendWorkspaceInvitationEmail({
  expiresAt,
  inviteUrl,
  roleLabel,
  to,
  workspaceName
}: SendInvitationEmailInput): Promise<InvitationEmailDelivery> {
  const apiKey = getResendApiKey();
  const from = getInviteEmailFrom();

  if (!apiKey || !from) {
    return {
      message: "Invite created. Copy the link manually.",
      status: "not_configured"
    };
  }

  const expiration = formatExpiration(expiresAt);
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeRoleLabel = escapeHtml(roleLabel);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const safeExpiration = escapeHtml(expiration);

  const text = [
    `You've been invited to join ${workspaceName} in Mercury Books.`,
    "",
    `Role: ${roleLabel}`,
    `Invite link: ${inviteUrl}`,
    `This invitation expires on ${expiration} UTC.`,
    "",
    "If you did not expect this invitation, you can ignore this email."
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.6">
      <p>You've been invited to join <strong>${safeWorkspaceName}</strong> in Mercury Books.</p>
      <p><strong>Role:</strong> ${safeRoleLabel}</p>
      <p>
        <a href="${safeInviteUrl}" style="display:inline-block;border-radius:8px;background:#0f172a;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700">
          Accept invitation
        </a>
      </p>
      <p style="color:#475569">This invitation expires on ${safeExpiration} UTC.</p>
      <p style="color:#64748b;font-size:13px">If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;color:#2563eb">${safeInviteUrl}</p>
      <p style="color:#64748b;font-size:13px">If you did not expect this invitation, you can ignore this email.</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html,
        subject: "You\u2019ve been invited to Mercury Books",
        text,
        to: [to]
      }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      return {
        error: parseResendError(body),
        message: "Invite created, but email could not be sent. Copy the link manually.",
        status: "failed"
      };
    }

    return {
      message: "Invitation email sent. Copy link remains available.",
      status: "sent"
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Email delivery failed.",
      message: "Invite created, but email could not be sent. Copy the link manually.",
      status: "failed"
    };
  }
}
