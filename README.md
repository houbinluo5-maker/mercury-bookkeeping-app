# Mercury Bookkeeping App

Private bookkeeping MVP for a US LLC ecommerce business. The app is manual-entry only and can use Supabase PostgreSQL for persistence when configured, with browser `localStorage` backup/restore kept as a fallback. It does not connect to Mercury, Shopify, Meta, TikTok, or real bank APIs.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Simple admin-password cookie auth for MVP private access
- Supabase PostgreSQL persistence through protected server-side API routes
- Browser-side Excel-compatible `.xls` export
- Local seed data in `lib/seed-data.ts`

## Features

- Dashboard with revenue, COGS, expenses, net income, reconciliation, receipt, owner draw, and transfer metrics
- Add Transaction form with bookkeeping rule classification
- Natural language transaction entry with confirmation preview before saving
- Transactions List with search, category filter, status badges, and Excel export
- Categories / Chart of Accounts
- Receipts tracker with inline receipt link updates
- Monthly Report
- Quarterly Report
- Annual Tax Summary grouped by tax line and category
- Settings stored locally
- Excel export for transactions, reports, and annual summaries
- Login/logout gate for private app access
- Data Management tools for clearing demo data, JSON backup, and JSON restore
- Supabase sync, load, and localStorage migration tools in Settings
- Transaction editing and deletion with automatic report updates
- Receipt filters for missing receipts, linked receipts, and reconciliation status
- English / Simplified Chinese language switch without mixing both languages in navigation or table headers

## Accounting Rules

The MVP applies these local rules in `lib/accounting-rules.ts` and the natural language parser in `lib/natural-language-parser.ts`:

- Meta Ads / Facebook Ads / Instagram Ads / TikTok Ads -> Advertising Expense
- Shopify payout -> Revenue, marked as needs reconciliation
- Supplier payment -> Product Cost / COGS
- Shipping payment -> Shipping / Fulfillment
- Shopify subscription and apps -> Software Expense
- Domain, hosting, email -> Website / Hosting
- Owner money into company -> Owner Contribution
- Mercury transfer to owner personal account -> Owner Draw / Member Distribution
- Mercury transfer to personal IBKR account -> Owner Draw, not business expense
- Mercury transfer to company brokerage account -> Investment Transfer

## Natural Language Entry

The Add Transaction page includes a sentence input for quick manual entry. The parser converts plain English into an editable transaction draft, then shows a confirmation preview with parser confidence before the transaction can be saved.

Supported examples:

- `Today Meta ads spent 400 dollars`
- `Today Facebook ads spent 400`
- `Shopify payout received 1260 today`
- `Paid supplier 850 for inventory`
- `Paid 120 for Shopify apps`
- `Transferred 500 from Mercury to owner personal account`
- `Owner contributed 2000 to the company`

The parser extracts date, amount, currency, direction, vendor, source, description, category, tax line, receipt requirement, reconciliation status, and notes. Low-confidence parses are clearly marked `Needs review`, and users can edit every parsed field before saving.

## Getting Started

Create a local environment file first:

```bash
cp .env.example .env.local
```

Set an admin password:

```bash
ADMIN_PASSWORD=choose-a-long-private-password
```

Supabase is optional for local development. Leave these empty to keep using browser `localStorage`, or set them after creating the database schema:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

If `ADMIN_PASSWORD` is missing, the login page shows a setup warning in development and protected pages redirect to `/login`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

## MVP Private Access

This app uses a deliberately simple MVP auth layer for private deployment:

- `/login` validates the submitted password against server-side `ADMIN_PASSWORD`.
- Successful login sets an HTTP-only cookie.
- Middleware requires that cookie before accessing Dashboard, Transactions, Reports, Receipts, Accounts, and Settings.
- The sidebar and mobile header include a logout button.

This is not a full user management system. Supabase auth is intentionally not enabled yet; future production auth can replace this layer when multi-user access, password reset, roles, and audit trails are needed.

## Folder Structure

```text
app/
  accounts/
  receipts/
  reports/
    annual-tax-summary/
    monthly/
    quarterly/
  settings/
  transactions/
    new/
components/
lib/
public/
```

## Data Model

Transactions include:

- `date`
- `account`
- `source`
- `vendor`
- `description`
- `currency`
- `money_in`
- `money_out`
- `category`
- `tax_line`
- `receipt_required`
- `receipt_link`
- `reconciled`
- `notes`

The app also stores a generated `id` and `created_at` timestamp for local UI state.

Supabase rows also include `updated_at`.

## Supabase Persistence

Supabase is the primary data source when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Supabase Auth is not used yet; the existing `ADMIN_PASSWORD` login remains the access gate.

### Create A Supabase Project

1. Create a project at Supabase.
2. Open the project dashboard.
3. Go to Project Settings -> API.
4. Copy the Project URL into `SUPABASE_URL`.
5. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.

Keep the service role key server-only. Do not add it to `NEXT_PUBLIC_*` variables or client code.

### Run The SQL Schema

Open the Supabase SQL editor and run:

```text
supabase/migrations/202605230001_bookkeeping_schema.sql
```

The migration creates:

- `transactions`
- `categories`
- `receipts`
- `company_settings`

RLS is enabled without public policies. The app reads and writes through protected server-side API routes using the service role key.

### Vercel Environment Variables

In Vercel, add these variables for the deployed app:

```bash
ADMIN_PASSWORD=choose-a-long-private-password
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Redeploy after changing environment variables.

### Migrate Local Data To Supabase

1. Log in to the app.
2. Open Settings.
3. Check the Storage Status badge.
4. Select `Migrate local data to Supabase` to push the current browser localStorage data into Supabase.
5. Use `Load from Supabase` to reload the app from the database.
6. Use `Sync to Supabase` when you want to push the current in-app data snapshot to Supabase.

The sync operation writes transactions, categories, receipt fields, and company settings. Backup export still uses the current in-app data, whether it came from Supabase or localStorage.

### Fall Back To LocalStorage

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the app automatically uses browser `localStorage`. Settings shows `Local storage mode` and keeps JSON backup/import available.

If Supabase is temporarily unavailable, export a local backup JSON before making risky changes. Once Supabase is available again, use Settings -> Supabase Persistence -> `Sync to Supabase`.

## Data Management

The app keeps localStorage backup/restore available even when Supabase is configured. Browser storage is private to the browser profile and device being used, but it can be lost if browser storage is cleared. Use Settings -> Data Management regularly.

### Clearing Demo Data

1. Open Settings.
2. Go to Data Management.
3. Select `Clear transactions`.
4. Confirm the modal.

This removes all locally stored transactions in the current browser, including demo seed transactions and any manual entries.

### Backing Up Data

1. Open Settings.
2. Select `Export local backup JSON`.
3. Keep the exported JSON file somewhere private and secure.

The JSON backup includes transactions, categories, receipt status/link data, and company settings.

### Restoring Data

1. Open Settings.
2. Select `Import local backup JSON`.
3. Choose a JSON file previously exported from this app.

Restoring replaces the local transactions, categories, and settings in the current browser. If Supabase mode is active, the restored snapshot is also synced to Supabase. Use `Reset demo seed data` if you want to return the app to the original sample dataset.

## Language Switching

Open Settings and choose `Language` under Company Settings. The MVP currently supports:

- `English`
- `简体中文`

The selected language is saved in browser `localStorage` as part of the local app settings. The default language is English.

The language switch translates navigation, page headings, labels, buttons, filters, status badges, and report display labels. Internal accounting category and `tax_line` values remain stable in stored transaction data so existing localStorage records, reports, exports, and future database migrations keep working.

## Editing Transactions

Open the Transactions page and select `Edit` on a row. You can update date, vendor, source, description, category, tax line, money in, money out, receipt link, receipt required status, reconciliation status, and notes. Deleting a transaction asks for confirmation first.

Dashboard totals, monthly reports, quarterly reports, annual tax summary, receipts, and transaction exports read from the same storage state, so edits and deletes update those views automatically. In Supabase mode, transaction add/edit/delete operations sync back through the protected server API.

## Receipt Links And Reconciliation

Use the Receipts page to add or update receipt links. Good support documents include Meta invoices, Shopify invoices, supplier invoices, shipping bills, domain or hosting invoices, bank statements, and payment confirmations.

- `Receipt missing`: the transaction requires a receipt, but `receipt_link` is empty.
- `Receipt linked`: a receipt URL is present.
- `Needs reconciliation`: the transaction is not marked reconciled yet, commonly used for Shopify payouts or ad invoices that need matching against source reports.
- `Reconciled`: the transaction has been reviewed against its source documentation.

## Future Improvements

Future production hardening can add Supabase Auth, per-user roles, audit logs, server-side validation, and private receipt file storage in Supabase Storage or another object store.

## Integration Guardrails

Do not add live Mercury, Shopify, Meta, TikTok, bank, or brokerage credentials to this repository. Future integrations should use server-only secrets, OAuth where available, least-privilege scopes, and reconciliation workflows before data is posted into books.
