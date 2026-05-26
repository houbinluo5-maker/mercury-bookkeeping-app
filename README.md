# Mercury Bookkeeping App

Private bookkeeping MVP for a US LLC ecommerce business. The app is manual-entry only and can use Supabase PostgreSQL for persistence when configured, with browser `localStorage` backup/restore kept as a fallback. It does not connect to Mercury, Shopify, Meta, TikTok, or real bank APIs.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Simple admin-password cookie auth for MVP private access
- Supabase PostgreSQL persistence and receipt file storage through protected server-side API routes
- Browser-side Excel-compatible `.xls` export
- Local seed data in `lib/seed-data.ts`

## Features

- Dashboard with revenue, COGS, expenses, net income, reconciliation, receipt, owner draw, and transfer metrics
- Add Transaction form with bookkeeping rule classification
- Natural language transaction entry with confirmation preview before saving
- Transactions List with search, category filter, status badges, and Excel export
- Mercury bank CSV import with browser-side parsing, duplicate detection, category preview, and Supabase/localStorage save
- Categories / Chart of Accounts
- Receipts tracker with inline receipt link updates and Supabase Storage receipt uploads
- Reconciliation Center for monthly close review, duplicate candidates, readiness scoring, and CPA issue exports
- Monthly Closing / locked accounting periods with close/reopen reasons, status badges, and CSV exports
- Audit Trail page with filters, CSV export, and inline change history in transaction, receipt, and reconciliation views
- Monthly Report
- Quarterly Report
- Annual Tax Summary grouped by tax line and category
- CPA / Tax Package page with CSV exports, an Excel-compatible workbook, and a receipt package index
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
- Wise, wire fee, and bank fee -> Bank Fees
- Stripe, PayPal, Shopify Payments, and merchant processing fees -> Payment Processing Fees
- Owner money into company -> Owner Contribution
- Mercury transfer to owner personal account -> Owner Draw / Member Distribution
- Mercury transfer to personal IBKR account -> Owner Draw, not business expense
- Mercury transfer to company brokerage account -> Investment Transfer
- Internal transfer or brokerage transfer -> Investment Transfer / balance sheet transfer

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

## Mercury CSV Import

Open `Import Mercury CSV` in the sidebar to upload a Mercury bank transaction CSV. CSV parsing happens entirely in the browser; the raw file is not sent to Mercury, OpenAI, or any third-party API. Only the confirmed imported transaction records are saved into the app's normal storage flow.

### Export CSV From Mercury

Mercury's support documentation says monthly transaction exports are available from `Documents & Data` -> `Statements`: select the needed account(s), open the vertical-dot download menu for the statement row, then download either a QuickBooks CSV or NetSuite CSV. Mercury also notes that transaction data can be exported from the Accounting page when you are not connected to an accounting integration.

Official references:

- [Exporting transaction data - Mercury](https://support.mercury.com/hc/en-us/articles/28768700685844-Exporting-transaction-data)
- [Navigating the Accounting page - Mercury](https://support.mercury.com/hc/en-us/articles/35624712696340-Navigating-the-Accounting-page)

### Import CSV Into The App

1. Log in to the bookkeeping app.
2. Open `Import Mercury CSV`.
3. Select a `.csv` file exported from Mercury.
4. Review the preview table before importing.
5. Adjust categories, receipt-required status, reconciliation status, or row selection as needed.
6. Select `Import selected rows`.

The parser supports common Mercury-style columns such as `Date`, `Description`, `Amount`, `Currency`, `Status`, `Bank Description`, `Counterparty`, `Reference`, and `Account`. Header matching is flexible, so slight column-name differences are accepted. Positive amounts become `money_in`; negative amounts become positive `money_out`; missing currency defaults to USD.

### Duplicate Detection

The import preview checks possible duplicates against existing transactions using date, signed amount, vendor/description text, and account. Possible duplicates show a warning and are skipped by default. You can manually include or exclude any valid row before importing.

### Classification Rules

The importer applies the same ecommerce bookkeeping categories used elsewhere in the app:

- Meta, Facebook, Instagram, and TikTok ads -> Advertising Expense
- Shopify payouts -> Revenue
- Shopify subscriptions and app charges -> Software Expense
- Supplier, inventory, and purchase order payments -> Product Cost / COGS
- Shipping, ShipBob, USPS, UPS, FedEx, and fulfillment payments -> Shipping / Fulfillment
- Namecheap, domain, hosting, and email payments -> Website / Hosting
- Wise, wire fees, and bank fees -> Bank Fees
- Stripe, PayPal, Shopify Payments, and merchant processing fees -> Payment Processing Fees
- Owner transfers into the company -> Owner Contribution
- Transfers to owner personal accounts -> Owner Draw / Member Distribution
- Internal or brokerage transfers -> Investment Transfer
- Unknown items -> Uncategorized and Needs review

Imported bank transactions default to `Reconciled` because they come from bank activity. `Receipt required` follows the selected category default. After import, rows appear in Dashboard, Transactions, Reconciliation Center, Monthly Report, Quarterly Report, Annual Tax Summary, and Receipts.

### Review Needs Review Rows

After importing, check the import summary for `Rows needing review`. Then open Transactions and filter/search for `Uncategorized` or `Needs review`. Update the category and tax line, add receipt links where required, and keep supporting documents such as invoices, bills, bank statements, or payment confirmations.

## Monthly Closing

Open `Monthly Closing` to review each month in the selected tax year, including transaction totals, revenue, expenses, net income, missing receipts, needs review, uncategorized, unreconciled, duplicate candidates, readiness score, and close status.

Use Reconciliation Center before closing a month. Clear missing required receipts, needs-review items, uncategorized transactions, unreconciled transactions, and unresolved duplicate candidates. Review the Tax Package summary and export a backup before closing.

After a month is closed, transactions dated inside that period show a `Closed period` badge. Sensitive edits to date, amounts, category, tax line, receipt fields, reconciliation status, source, vendor, description, or notes require a reason. The app saves field-level audit logs with old value, new value, actor, source, and reason.

Closed months can be reopened only with a required reason. Reopened periods are shown in reports and Tax Package because they may need CPA review before relying on exports.

Monthly closing adds CSV exports for closing summaries, closed-period changes, and closing checklists. These exports support CPA review but do not replace professional accounting judgment.

Disclaimer: this app organizes bookkeeping data and audit history. It is not tax, legal, accounting, or financial advice. Have a qualified professional review records before filing or relying on reports.

## Getting Started

Create a local environment file first:

```bash
cp .env.example .env.local
```

Configure authentication. Supabase Auth is the primary account system; `ADMIN_PASSWORD` is a temporary legacy fallback:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ADMIN_PASSWORD=choose-a-long-private-password
ALLOW_PUBLIC_SIGNUP=false
ENABLE_GOOGLE_LOGIN=false
ENABLE_GITHUB_LOGIN=false
ENABLE_MICROSOFT_LOGIN=false
```

Supabase is optional for local development. Leave these empty to keep using browser `localStorage`, or set them after creating the database schema:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Receipt file upload also uses the server-only Supabase variables. Do not expose the service role key to browser code or any `NEXT_PUBLIC_*` variable.

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

## Authentication and Workspace Access

Mercury Books supports Supabase Auth email/password login, Google OAuth, and provider-ready GitHub/Microsoft flags. A new account receives a profile, an owner workspace, and a workspace membership. Server APIs verify the logged-in user and scope Supabase persistence by workspace before reading or writing ledger data.

- `/login` supports email/password and enabled OAuth providers.
- `/register` creates a Supabase Auth user and owner workspace when signup is allowed.
- `/forgot-password` and `/reset-password` use Supabase Auth password recovery.
- `/account` shows user, workspace, and role context.
- `ADMIN_PASSWORD` remains available only through the legacy fallback panel.

Public signup is closed by default after the first owner exists unless `ALLOW_PUBLIC_SIGNUP=true`.

### Google Login Setup

1. Enable the Google provider in Supabase Auth Providers.
2. Create a Google OAuth client ID in Google Cloud.
3. Add local and production domains as authorized JavaScript origins.
4. Add the Supabase Auth callback URL as an authorized redirect URI.
5. Add the app `/auth/callback` URL to the Supabase redirect allow list.
6. Set the Supabase Site URL to the production app URL.
7. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel.
8. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Folder Structure

```text
app/
  accounts/
  audit/
  imports/
    mercury/
  reconciliation/
  receipts/
  reports/
    annual-tax-summary/
    monthly/
    quarterly/
    tax-package/
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

Audit history rows include:

- `id`
- `entity_type`
- `entity_id`
- `action`
- `field_name`
- `old_value`
- `new_value`
- `reason`
- `created_at`
- `actor`
- `source`

## Supabase Persistence

Supabase is the primary data source when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Supabase Auth provides account login, while server routes continue to use the service role key privately for protected database and storage operations.

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
supabase/migrations/202605240001_audit_logs.sql
```

The migration creates:

- `transactions`
- `categories`
- `receipts`
- `company_settings`
- `audit_logs`

RLS is enabled without public policies. The app reads and writes through protected server-side API routes using the service role key.

### Create The Receipts Storage Bucket

Receipt uploads use Supabase Storage through protected server-side API routes. Create a private bucket named:

```text
receipts
```

Recommended bucket settings:

- Public bucket: `Off` / private
- File size limit: `10 MB`
- Allowed MIME types:
  - `application/pdf`
  - `image/png`
  - `image/jpeg`
  - `image/webp`

You can create this in the Supabase Dashboard under Storage -> New bucket. Keep the bucket private; the app downloads uploaded receipts through `/api/receipts/file`, which checks the existing admin session and uses the server-only service role key.

### Vercel Environment Variables

In Vercel, add these variables for the deployed app:

```bash
ADMIN_PASSWORD=choose-a-long-private-password
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
ALLOW_PUBLIC_SIGNUP=false
ENABLE_GOOGLE_LOGIN=false
ENABLE_GITHUB_LOGIN=false
ENABLE_MICROSOFT_LOGIN=false
```

Redeploy after changing environment variables.

### Migrate Local Data To Supabase

1. Log in to the app.
2. Open Settings.
3. Check the Storage Status badge.
4. Select `Migrate local data to Supabase` to push the current browser localStorage data into Supabase.
5. Use `Load from Supabase` to reload the app from the database.
6. Use `Sync to Supabase` when you want to push the current in-app data snapshot to Supabase.

The sync operation writes transactions, categories, receipt fields, company settings, and audit history. Backup export still uses the current in-app data, whether it came from Supabase or localStorage.

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

The JSON backup includes transactions, categories, receipt status/link data, company settings, and audit history.

### Restoring Data

1. Open Settings.
2. Select `Import local backup JSON`.
3. Choose a JSON file previously exported from this app.

Restoring replaces the local transactions, categories, and settings in the current browser, then merges any audit history found in the backup into the existing append-only trail. If Supabase mode is active, the restored snapshot is also synced to Supabase. Use `Reset demo seed data` if you want to return the app to the original sample dataset.

## Language Switching

Open Settings and choose `Language` under Company Settings. The MVP currently supports:

- `English`
- `简体中文`

The selected language is saved in browser `localStorage` as part of the local app settings. The default language is English.

The language switch translates navigation, page headings, labels, buttons, filters, status badges, and report display labels. Internal accounting category and `tax_line` values remain stable in stored transaction data so existing localStorage records, reports, exports, and future database migrations keep working.

## Editing Transactions

Open the Transactions page and select `Edit` on a row. You can update date, vendor, source, description, category, tax line, money in, money out, receipt link, receipt required status, reconciliation status, and notes. Sensitive changes such as amount, category, tax line, receipt requirement, reconciliation status, and deletion ask for an optional reason and are captured in the audit trail. The edit modal also shows recent audit history for that transaction.

Dashboard totals, reconciliation views, monthly reports, quarterly reports, annual tax summary, tax package exports, receipts, and transaction exports read from the same storage state, so edits and deletes update those views automatically. In Supabase mode, transaction add/edit/delete operations sync back through the protected server API.

## Receipt Links And Reconciliation

Use the Receipts page, the missing receipts section, or the Transactions edit modal to upload receipt files or add external private receipt links. Good support documents include Meta invoices, Shopify invoices, supplier invoices, shipping bills, domain or hosting invoices, bank statements, and payment confirmations.

Uploaded files are stored in the private Supabase Storage bucket named `receipts`. The app stores the uploaded object path in `transaction.receipt_link`, for example `transactions/{transactionId}/{fileName}`. Manual external links can still be stored in the same field.

Supported upload types:

- PDF
- PNG
- JPG / JPEG
- WebP

Uploads are limited to `10 MB`. Replacing an uploaded receipt stores the new file and deletes the previous app-managed object from Supabase Storage. Deleting a receipt removes app-managed uploaded files from Storage and clears `transaction.receipt_link`; manual external links are only unlinked from the transaction.

Expense and COGS categories require receipts by default, including Advertising Expense, Product Cost / COGS, Shipping / Fulfillment, Software Expense, Website / Hosting, Bank Fees, and Payment Processing Fees. Revenue, owner equity activity, and investment/internal transfers default to receipt optional unless you manually mark a transaction as receipt required.

- `Receipt missing`: the transaction requires a receipt, but `receipt_link` is empty.
- `Receipt linked`: a receipt URL or uploaded receipt path is present.
- `Needs reconciliation`: the transaction is not marked reconciled yet, commonly used for Shopify payouts or ad invoices that need matching against source reports.
- `Reconciled`: the transaction has been reviewed against its source documentation.

## Tax Package / CPA Export

Open `Tax Package` under Reports to prepare a tax-ready bookkeeping export for a US LLC ecommerce business. The page is protected by the same admin-password login as the rest of the app. Choose a tax year or date range, then narrow the package by category, receipt status, reconciliation status, or needs-review status.

The dashboard separates revenue, refunds, COGS, operating expenses, owner equity activity, internal transfers, missing receipts, needs-review rows, and unreconciled transactions. Owner contributions are not counted as revenue, owner draws are not treated as deductible expenses, internal or investment transfers are excluded from income and expenses, sales tax payable rows are excluded from revenue, refunds reduce revenue, and COGS stays separate from operating expenses.

The export buttons generate:

- `Full transaction ledger CSV`: every filtered transaction with bookkeeping fields, receipt status, reconciliation status, and review status.
- `Category summary CSV`: totals by category, category type, tax line, net amount, and tax treatment.
- `Monthly P&L CSV`: month-by-month revenue, refunds, COGS, expense categories, and net income.
- `Quarterly P&L CSV`: quarter-by-quarter revenue, refunds, COGS, expense categories, and net income.
- `Missing receipts CSV`: required transactions that still do not have a receipt link or uploaded receipt path.
- `Needs review CSV`: uncategorized or manually flagged rows that should be cleaned up before filing.
- `Owner contributions/draws CSV`: owner equity activity that should be reviewed separately from income and deductions.
- `Reconciliation issues CSV`: transactions not yet marked reconciled.
- `Receipt package index CSV`: transaction ID, date, vendor, category, amount, receipt link/path, and receipt status so a CPA can match ledger lines to supporting documents.

The `Export tax package workbook` button downloads one Excel-compatible `.xls` workbook with Summary, Transactions, Category Summary, Monthly P&L, Quarterly P&L, Missing Receipts, Needs Review, Owner Contributions & Draws, and Reconciliation Issues sheets.

Send your CPA/accountant the workbook, any CSV files they prefer, the receipt package index, and access to the private receipt storage or document folder that contains the linked files. Uploaded receipts are linked through `transaction.receipt_link` as Supabase Storage object paths, while manual external receipt links remain in the same field. The app does not download every receipt file into a zip yet.

Before relying on the package, manually review Missing Receipts, Needs Review, Reconciliation Issues, sales tax payable treatment, refunds/chargebacks, owner transfers, and any rows with unclear category or tax line. This export is for bookkeeping organization and CPA/accountant review only; it is not tax, legal, or financial advice.

## Reconciliation Center

Open `Reconciliation Center` from the sidebar before monthly closing or CPA export. The page is protected by the same admin-password login as the rest of the app and brings the main bookkeeping cleanup queues into one place: missing receipts, needs review rows, uncategorized transactions, unreconciled transactions, duplicate candidates, revenue deposit review, expense payment review, owner activity, internal transfers, and tax package blockers.

Use the filters to narrow by date range, month, category, issue type, receipt status, reconciliation status, or review status. Each issue row supports practical cleanup actions such as opening the edit modal, marking a transaction reconciled, marking receipt not required, adding a note, uploading a receipt, or changing category where that helps resolve the issue.

### How Missing Receipts Are Detected

Missing receipts are transactions where `receipt_required = true` and `receipt_link` is empty. Expense and COGS categories usually require receipts by default, so these rows are highlighted as important cleanup items before close or CPA handoff.

### How Duplicate Detection Works

Duplicate candidates are found when two transactions have the same signed amount, land on the same date or within one day, and have similar vendor, source, or description text. The Reconciliation Center shows both transactions, the reasons for the warning, and a medium or high confidence label. You can mark a pair as `not duplicate` to suppress that exact warning later, or delete the likely duplicate after confirming.

### How Owner Transfers Are Reviewed

Owner Contributions, Owner Draws / Member Distributions, Investment Transfers, and Internal Transfers are reviewed separately so they are not mistaken for revenue or deductible expenses. The app flags direction problems, unclear transfer notes, unreconciled owner activity, and transfer classifications that look like they could affect net income incorrectly.

### How Readiness Score Is Calculated

The monthly readiness score starts at `100` and deducts points for:

- Missing receipts
- Needs review rows
- Uncategorized transactions
- Unreconciled transactions
- Possible duplicates
- Uncategorized expenses
- Unclear owner transfers

The score is shown with a status of `Ready`, `Needs review`, or `Not ready`, plus the top five issues to fix first.

### Reconciliation Exports

The Reconciliation Center exports CSV files for:

- All reconciliation issues
- Missing receipts
- Needs review
- Duplicate candidates
- Unreconciled transactions
- Owner transfer review
- Monthly readiness checklist

These exports are useful for monthly close review, internal bookkeeping cleanup, and CPA follow-up. They are organizational support files, not tax or legal advice.

## Audit Trail

Open `Audit Trail` from the sidebar to review append-only bookkeeping change history. The page is protected by the same admin-password login as the rest of the app and includes search, date range filters, entity-type filters, action filters, source filters, and CSV export.

### What Audit Trail Tracks

The audit trail records important bookkeeping events such as:

- Transaction creation, edits, and deletion
- Receipt uploads, replacements, deletions, and manual receipt linking
- Receipt-required changes
- Reconciliation changes such as mark reconciled, review resolved, duplicate dismissal, and reconciliation notes
- Mercury CSV transaction imports
- Settings updates

Each entry stores timestamp, entity type, entity ID, action, changed field, old value, new value, optional reason, actor (`admin` or `system`), and source (`manual`, `import`, `system`, `csv_import`, or `receipt_upload`).

### Why It Matters

Audit history helps bookkeeping cleanup, monthly close review, and CPA follow-up by showing who changed what, when it changed, and why. It also makes it easier to confirm that owner transfers, receipt exceptions, and tax-line updates were intentional rather than accidental.

### Inline Audit History

You can review recent audit entries directly in:

- The Transaction edit modal
- Receipt row details on the Receipts page
- Issue row details inside Reconciliation Center

### Exporting Audit Logs

Use the `Export audit log CSV` button on the Audit Trail page when you want to share change history with a CPA, accountant, or internal reviewer. The export is a bookkeeping support file, not legal advice, and it does not allow audit entries to be deleted from the UI.

## Future Improvements

Future production hardening can add Supabase Auth, per-user roles, stronger audit-log retention controls, server-side validation, and private receipt file storage in Supabase Storage or another object store.

## Integration Guardrails

Do not add live Mercury, Shopify, Meta, TikTok, bank, or brokerage credentials to this repository. Future integrations should use server-only secrets, OAuth where available, least-privilege scopes, and reconciliation workflows before data is posted into books.
