# Workspace Switcher

Mercury Books supports users who belong to multiple workspaces through active `workspace_members` rows. The active workspace is selected by the `mercury_active_workspace` cookie and is used by server-side workspace scoping and RBAC checks.

## Behavior

- `/api/auth/me` returns the active workspace plus every active workspace membership for the signed-in Supabase Auth user.
- `/api/workspaces/switch` accepts a `workspaceId`, verifies the current user has an active membership in that workspace, and then updates the active workspace cookie.
- The sidebar workspace card shows the current workspace, current role, and a selector when more than one active workspace is available.
- `/account` lists all accessible workspaces and lets the user switch to a non-active workspace.
- Invitation acceptance already sets the invited workspace as active before redirecting to `/team`.

## Safety Rules

- Revoked or non-active memberships are not listed or switchable.
- Legacy admin fallback users cannot switch through the Supabase workspace switch API.
- Switching does not create, delete, or duplicate workspaces or memberships.
- Existing workspace-scoped APIs continue to derive permissions from the active workspace context.

## Manual QA

- Owner sees their own workspace as Owner.
- Invited user sees both their own workspace and the invited workspace.
- Invited user can switch to the invited workspace.
- Viewer role hides Add Transaction and blocks mutation APIs.
- CPA role cannot upload or edit receipts.
- Switching back to the owned workspace restores Owner actions.
- Accepting an invitation lands in the invited workspace.
- Posting an inaccessible `workspaceId` to `/api/workspaces/switch` returns `403`.
