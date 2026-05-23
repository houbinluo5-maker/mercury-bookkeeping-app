# Mercury Bookkeeping App

Private bookkeeping MVP for a US LLC ecommerce business. The first version is manual-entry only and runs from local sample data plus browser `localStorage`; it does not connect to Mercury, Shopify, Meta, TikTok, Supabase, or real bank APIs.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Simple admin-password cookie auth for MVP private access
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

## Future Supabase Integration

The current app keeps all data in `localStorage`, so each browser profile has its own copy. Supabase can be added later by:

1. Creating tables for `transactions`, `categories`, `settings`, and `receipts`.
2. Moving `lib/storage.tsx` behind a repository/service layer.
3. Replacing local mutations with Supabase queries and row-level security.
4. Adding authentication for the LLC owner/admin role.
5. Storing receipt files in Supabase Storage or another private object store.

Environment placeholders are included in `.env.example`.

## Integration Guardrails

Do not add live Mercury, Shopify, Meta, TikTok, bank, or brokerage credentials to this repository. Future integrations should use server-only secrets, OAuth where available, least-privilege scopes, and reconciliation workflows before data is posted into books.
