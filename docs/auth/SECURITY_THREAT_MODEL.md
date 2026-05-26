# Auth Security Threat Model

## Assets

- Supabase service role key
- User sessions and refresh tokens
- Transactions, receipts, categories, settings, audit logs, monthly closings, and tax package data
- Private Supabase Storage receipt files
- Workspace membership and roles
- OAuth redirect configuration

## Trust Boundaries

- Browser to Next.js server routes
- Browser to Supabase Auth public endpoints
- Next.js server to Supabase REST and Auth admin endpoints
- Next.js server to Supabase Storage
- LocalStorage draft data to server persistence

## Threats and Mitigations

### Service Role Exposure

Risk: A service role key in browser code would bypass RLS and tenant controls.

Mitigation: Browser code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server admin calls use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only in server modules.

### Cross-Workspace Data Access

Risk: A user could request another workspace's transactions, receipts, audit logs, or reports.

Mitigation: Server APIs verify Supabase access tokens, resolve workspace membership, and scope all Supabase queries by `workspace_id`.

### Unauthorized Signup

Risk: Public signup creates unknown customer workspaces in a private deployment.

Mitigation: `ALLOW_PUBLIC_SIGNUP` defaults to disabled after the first owner workspace exists. The UI shows invite-only copy when signup is closed.

### OAuth Redirect Abuse

Risk: Misconfigured redirect URLs could leak tokens.

Mitigation: Supabase and Google redirect allow lists must include only trusted local and production domains. Callback route stores sessions through same-origin server APIs.

### Receipt File Leakage

Risk: Receipt object paths could be guessed or downloaded across tenants.

Mitigation: Receipt routes verify session, workspace membership, transaction ownership, and path prefix. New paths include `receipts/{workspace_id}/{transaction_id}/filename`.

### Missing Audit Attribution

Risk: Changes after auth migration remain attributed only to "admin".

Mitigation: API auth context includes user id and email. Audit logs include actor identity where the schema supports it; legacy rows remain readable.

### LocalStorage Risks

Risk: LocalStorage is per-browser and not tenant-safe.

Mitigation: LocalStorage remains draft/fallback only. Server persistence requires authenticated workspace APIs.

### Destructive Actions

Risk: Deletes or closed-period edits could be made without accountability.

Mitigation: Existing closed-period reason requirements remain in place. Auth adds user/workspace context to server-side changes.

## Residual Risk

Full role-based authorization for bookkeeper/viewer permissions is foundation-ready but should be expanded before inviting multi-role customer teams.
