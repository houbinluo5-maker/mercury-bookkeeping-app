# Contributing

Thank you for your interest in contributing to Mercury Bookkeeping App.

This project is an open-source bookkeeping app starter for small ecommerce businesses. Contributions that improve reliability, documentation, setup instructions, CSV import handling, reporting, testing, and ecommerce bookkeeping workflows are welcome.

## How to Contribute

You can contribute by:

* Reporting bugs
* Suggesting improvements
* Improving documentation
* Adding tests
* Improving CSV import support
* Improving bookkeeping workflows
* Improving accessibility or UI quality

## Local Development

Clone the repository:

```bash
git clone https://github.com/houbinluo5-maker/mercury-bookkeeping-app.git
cd mercury-bookkeeping-app
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Pull Requests

Before opening a pull request, please make sure:

* The project builds successfully
* The code is clear and easy to understand
* No private keys, credentials, customer data, bank data, or personal financial records are included
* Documentation is updated if the change affects setup or usage

## Security and Privacy

Do not commit real bank data, Mercury account data, Shopify data, Meta/TikTok ad data, customer information, API keys, Supabase service role keys, or private business records.

Use sample data only.

## Project Scope

This project does not connect directly to live Mercury, Shopify, Meta, TikTok, bank, or brokerage APIs. It is designed to work with manual entries, sample data, and CSV-style imports.

Future integrations should use secure server-side credentials, least-privilege permissions, and clear reconciliation workflows.
