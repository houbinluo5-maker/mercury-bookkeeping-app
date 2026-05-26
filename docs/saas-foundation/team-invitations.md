# Team Invitations and Member Management

## Scope

Phase 2 adds workspace team invitations and member management only. Billing, subscription plans, owner transfer, and full RBAC are intentionally out of scope.

## Roles

- `owner`: can invite Admin, Viewer, and CPA users; can revoke pending invitations; can remove non-owner members; can change non-owner roles between Admin, Viewer, and CPA.
- `admin`: can invite Viewer and CPA users.
- `viewer`: cannot invite or manage members.
- `cpa`: cannot invite or manage members.

Owner invitations and owner role changes are not supported in this phase.

## Invitation Lifecycle

1. A permitted member creates an invitation from `/team`.
2. The app stores a `workspace_invitations` row with a secure token, normalized email, role, status, expiry, and inviter.
3. Email sending is not implemented yet. The UI clearly shows a copyable invite URL for manual delivery.
4. Pending invitations can be revoked by the workspace owner.
5. Accepted invitations are marked `accepted` and linked to the accepting authenticated user.

Invitation tokens are used in invite URLs. They are not written into audit log details.

## Accept Flow

1. The recipient opens `/invite/[token]`.
2. If the recipient is not logged in, the app redirects to `/login?next=/invite/[token]`.
3. The logged-in user email is normalized with lowercase and trim.
4. Acceptance is allowed only when the logged-in normalized email matches the invitation normalized email.
5. On acceptance, the app creates or reactivates a `workspace_members` row, marks the invitation accepted, records `accepted_by` and `accepted_at`, and redirects to `/team`.

Different-email acceptance is rejected with a clear error.

## Audit Logs

The app writes audit log entries for:

- `member_invited`
- `invitation_accepted`
- `invitation_revoked`
- `member_removed`
- `member_role_changed`

Audit entries are workspace-scoped and include actor user ID and actor email when available.

## Security Notes

- Service-role access remains server-only.
- Browser clients call protected app APIs, not Supabase service-role APIs.
- Invitations never grant owner access.
- Removed members are marked `revoked`; data is not deleted.
- Owners cannot remove themselves or change owner roles in this phase.
- Team APIs require an authenticated account context and active workspace membership.
- Normal bookkeeping, receipt, reconciliation, monthly close, report, and tax package logic is unchanged.

## Manual QA

- Owner can open `/team`.
- Owner can create an Admin, Viewer, or CPA invitation.
- Pending invitation appears with a copyable invite URL.
- Invite URL opens `/invite/[token]`.
- Logged-out users are redirected to login with the invite path preserved.
- Same-email logged-in user can accept the invitation.
- Different-email logged-in user cannot accept the invitation.
- Accepted user appears as an active workspace member.
- Owner can revoke a pending invitation.
- Owner can remove a non-owner active member.
- Owner can change a non-owner role between Admin, Viewer, and CPA.
- Admin can invite Viewer or CPA only.
- Viewer and CPA cannot invite members.
- Existing owner still sees the current workspace, dashboard, and sidebar.
