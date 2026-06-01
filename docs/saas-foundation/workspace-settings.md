# Workspace Settings

Phase 6 upgrades `/settings` into a SaaS-ready workspace control center. It does not add billing, Stripe, subscription checkout, paid plans, workspace deletion, or changes to auth, OAuth, logout, workspace switching, exports, or audit rules outside settings updates.

## Settings Sections

Workspace profile:

- Workspace name
- Company legal name
- Business type
- Tax year
- Currency
- Country / region
- Timezone display preference
- Language

Company information:

- Legal company name
- DBA / brand name
- Entity type
- EIN / Tax ID
- Registered state
- Business address
- Contact email
- Finance contact name

Finance operations preferences:

- Require receipts above a threshold
- Receipt required threshold amount
- Default tax year
- Default currency
- Monthly close reminder day
- Lock closed months
- Allow admins to reopen months
- CPA read-only note
- Default transaction category fallback

Security and access:

- Workspace owner summary
- Current user role
- Team access summary
- OAuth provider status when available
- Last workspace switch when available
- Links to Team Members, Audit Trail, and Account

Data and compliance:

- Audit trail enabled
- Export permissions enabled
- Role-based access enabled
- UTC storage with China time display
- Data retention policy placeholder
- Receipt retention policy placeholder
- Export watermark preference
- CPA handoff readiness

Commercial readiness:

- Plan and billing: coming soon
- Usage limits: coming soon
- Seats: coming soon
- Advanced exports: coming soon
- Dedicated CPA access: coming soon

These commercial cards are UI groundwork only. They do not enforce plans, collect payment, or integrate with a billing provider.

## Role Permissions

| Setting area | Owner | Admin | CPA | Viewer |
| --- | --- | --- | --- | --- |
| Workspace profile | Edit | Read | Read | Read |
| Company information | Edit | Read | Read | Read |
| Finance operations fields | Edit | Limited edit | Read | Read |
| Security/access preferences | Edit | Read | Read | Read |
| Data/compliance preferences | Edit | Read | Read | Read |
| Commercial readiness cards | Read | Read | Read | Read |

Admins can update only low-risk operational preferences:

- `require_receipts_over_threshold`
- `receipt_required_threshold_amount`
- `monthly_close_reminder_day`
- `default_category_fallback`

Owners can update all settings fields. CPA and Viewer roles are read-only and see:

- "You have read-only access to workspace settings."
- "Ask the workspace owner to change settings."

Server mutations enforce the same rules. Unauthorized settings updates return:

```json
{
  "error": "You do not have permission to update workspace settings."
}
```

## Audit Behavior

Successful settings changes write `settings_updated` audit logs. Each changed field is logged as a separate audit event with:

- actor email
- actor role
- workspace id
- changed field
- old value
- new value
- settings section
- result: `success`

Denied settings attempts write `permission_denied` audit logs with attempted fields and result `denied`.

Audit details must not include secrets, tokens, API keys, file contents, raw CSV contents, or full documents. EIN / Tax ID values are masked in audit details, for example `***1234`.

## Data Model Notes

Settings continue to use the existing `company_settings` storage path. Phase 6 extends that model with SaaS workspace fields instead of creating a duplicate settings table.

The migration `supabase/migrations/202606010002_workspace_settings_saas_readiness.sql` adds nullable/defaulted workspace profile, company, operations, compliance, and commercial readiness fields. It also scopes the settings row by `workspace_id` for multi-workspace persistence.

Application timestamps remain stored as UTC ISO values. The settings page only controls display preference; it does not store local time in the database.

## Manual QA Checklist

- Owner can view and update all workspace settings.
- Admin can update only receipt threshold, monthly close reminder day, and default category fallback.
- Admin cannot update workspace profile, company identity, security/access, or data retention settings.
- CPA sees read-only settings.
- Viewer sees read-only settings.
- Unauthorized API settings update returns `403`.
- Settings update writes `settings_updated` audit logs.
- Denied settings update writes `permission_denied` audit logs.
- EIN / Tax ID values are masked in audit details.
- Commercial readiness cards are disabled / coming soon only.
- No Stripe, billing, subscription checkout, or paid-plan logic is present.
- Existing dashboard still works.
- Transactions still work.
- Receipts still work.
- Monthly close still works.
- Audit Trail still works.
- Workspace switcher still works.
- Email login still works.
- Google login still works.
- Microsoft login still works.
- Logout still works.
