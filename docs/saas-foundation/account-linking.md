# Account Linking and Legacy Workspace Claim

## Workspace Resolution Order

After a Supabase Auth login, Mercury Books resolves the active workspace in this order:

1. Use an existing `workspace_members` row for the authenticated user. If the active workspace cookie points to one of the user's memberships, that membership is preferred.
2. Normalize the Supabase Auth email with lowercase + trim, then link to an existing profile/workspace only when the normalized email matches.
3. Surface an unclaimed `legacy-workspace` on the Account page when existing legacy data is detected.
4. Create a new workspace only when no existing membership or normalized-email match can be safely resolved.

## Legacy Claim Behavior

The Account page shows a "Legacy workspace found" card when the server detects existing data in `legacy-workspace` and the workspace has not already been claimed by another owner.

Claiming the workspace:

- Adds or updates a `workspace_members` row for the authenticated user with role `owner`.
- Sets `workspaces.owner_user_id` to the authenticated user.
- Preserves existing transactions, receipts, settings, audit logs, monthly closings, reconciliation data, and reports in place.
- Sets the active workspace cookie to `legacy-workspace`.
- Writes an `audit_logs` entry with `entity_type = workspace` and `action = workspace_claimed`.

## Safety Rules

- Email matching uses normalized email only. Accounts with different normalized emails are never silently linked.
- Existing profiles are not deleted or merged.
- Existing bookkeeping rows are not copied, deleted, or rewritten during claim.
- A legacy workspace already owned by another user cannot be claimed.
- Team invitations, billing, and full RBAC are intentionally out of scope for Phase 1.

## Manual QA

1. Sign in with email/password and confirm `/account` renders the signed-in email, provider, active workspace, role, and ownership status.
2. Sign in with Google using the same normalized email as an existing profile and confirm the same workspace resolves instead of a duplicate workspace.
3. Sign in with Microsoft using the same normalized email and confirm the same workspace resolves.
4. With unclaimed legacy data present, open `/account`, click "Claim this workspace", and confirm the active workspace changes to the legacy workspace.
5. Confirm existing transactions, receipts, monthly closing records, audit logs, and reports still appear after claim.
6. Confirm no duplicate bookkeeping rows are created by the claim.
7. Confirm dashboard/sidebar still render after claim.
