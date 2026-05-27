# Workspace RBAC Permissions

Mercury Books now enforces workspace role permissions for the authenticated workspace membership. Roles are enforced on the server for mutating APIs and reflected in the UI so read-only users are not shown broken editing workflows.

## Role Matrix

| Capability | Owner | Admin | Viewer | CPA |
| --- | --- | --- | --- | --- |
| Manage workspace | Yes | No | No | No |
| Manage members | Yes | No | No | No |
| Invite members | Admin, Viewer, CPA | Viewer, CPA | No | No |
| Manage settings | Yes | No | No | No |
| Create/edit transactions | Yes | Yes | No | No |
| Delete transactions | Yes | Yes | No | No |
| Upload/replace/delete receipts | Yes | Yes | No | No |
| Run reconciliation actions | Yes | Yes | No | No |
| Close/reopen months | Yes | Yes | No | No |
| View/export reports | Yes | Yes | Yes | Yes |
| View/export tax package | Yes | Yes | Yes | Yes |
| View audit trail | Yes | Yes | Yes | Yes |
| View team page | Yes | Yes | Yes | Yes |

`bookkeeper` is treated as an operational role for legacy compatibility if older data still contains it.

## Permission Helpers

Central helpers live in `lib/permissions.ts`:

- `permissionsForRole`
- `canManageWorkspace`
- `canManageMembers`
- `canManageSettings`
- `canEditTransactions`
- `canDeleteTransactions`
- `canUploadReceipts`
- `canDeleteReceipts`
- `canRunReconciliation`
- `canCloseMonth`
- `canReopenMonth`
- `canViewReports`
- `canExportReports`
- `canViewTaxPackage`
- `canExportTaxPackage`
- `canViewAuditTrail`
- `canViewTeam`
- `canInviteMembers`
- `canInviteRole`

Permission decisions are based on the active `workspace_members` row for the current authenticated user and active workspace.

## API Enforcement Rules

Mutating routes must check the current workspace membership before making changes and return:

```json
{
  "error": "You do not have permission to perform this action."
}
```

with HTTP `403 Forbidden` when the role is not allowed.

Current guarded areas:

- Transaction create/import/update/delete
- Receipt link/upload/delete mutation APIs
- Monthly closing close/reopen/summary updates
- Team invite/revoke/remove/role changes
- Settings and full-backup writes through storage APIs
- Audit append API

Read-only routes, health checks, and invitation acceptance stay available where appropriate.

## Audit Logging

Denied sensitive mutation attempts are logged with action `permission_denied` where practical. Audit details include:

- actor email/user id
- actor role
- workspace id
- attempted action
- entity type/id when available

The migration `supabase/migrations/202605270001_rbac_permission_denied_audit.sql` adds `permission_denied` to the audit action check constraint.

## Security Notes

- RBAC is enforced server-side; hiding buttons is only a usability layer.
- Viewer and CPA roles are read-only for bookkeeping data and receipt files.
- Owner is the only role that can manage workspace settings or remove/change non-owner members.
- Admin can operate bookkeeping workflows but cannot change owner/member management or workspace settings.
- Owner transfer, billing permissions, subscription gating, and detailed export policies are out of scope for this phase.

## Manual QA Checklist

- Owner can create, edit, and delete transactions.
- Owner can upload, replace, and delete receipts.
- Owner can close and reopen months.
- Owner can invite team members and manage non-owner members.
- Admin can edit operational bookkeeping data.
- Admin cannot remove/change Owner.
- Viewer cannot create/edit/delete data.
- Viewer cannot upload receipts.
- Viewer cannot reconcile or close months.
- CPA cannot create/edit/delete data.
- CPA can view receipts, reports, tax package, and audit trail.
- Unauthorized mutation API calls return `403`.
- Dashboard and sidebar render for all roles.
- Existing owner `houbinluo5@gmail.com` still has full access.
- Email login, Google login, Microsoft login, logout, and team invite acceptance still work.
