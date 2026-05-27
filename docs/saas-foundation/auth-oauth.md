# OAuth auth flow operations

Mercury Books uses Supabase Auth for email/password and OAuth sign-in. Google and Microsoft/Azure OAuth start inside the app, redirect through Supabase Auth, and return to the server callback at the canonical production host before session cookies are written.

## Canonical host behavior

- Production auth flows use `https://www.novarn.de` as the canonical origin.
- Requests to `https://novarn.de` are redirected with a 308 to the same path and query on `https://www.novarn.de`.
- Auth routes also canonicalize before writing cookies or exchanging OAuth codes. This prevents PKCE verifier and session cookies from being written on `novarn.de` while callbacks arrive on `www.novarn.de`.
- Localhost, `127.0.0.1`, Vercel preview domains, and `mercury-bookkeeping-app.vercel.app` are not canonicalized unless they are explicitly routed through the Novarn production hosts.

## Redirect URLs

Supabase Auth settings should use:

- Site URL: `https://www.novarn.de`

Supabase Redirect URLs should include:

- `https://www.novarn.de/api/auth/callback`
- `https://www.novarn.de/auth/callback`
- `https://novarn.de/api/auth/callback`
- `https://novarn.de/auth/callback`
- `https://www.novarn.de/reset-password`
- `https://mercury-bookkeeping-app.vercel.app/api/auth/callback`
- `https://mercury-bookkeeping-app.vercel.app/auth/callback`

Google Cloud Authorized redirect URI should be the Supabase callback URL:

- `https://jqrfqzpgyptjiarfagvs.supabase.co/auth/v1/callback`

Microsoft/Azure should also redirect to the Supabase Auth callback URL for the configured Supabase project, not directly to the app callback. The app passes `redirect_to=https://www.novarn.de/api/auth/callback` to Supabase so Supabase can return the user to Mercury Books after provider login.

## OAuth route behavior

- `/api/auth/oauth/google` maps to Supabase provider `google`.
- `/api/auth/oauth/azure` maps to Supabase provider `azure`.
- Azure requests include `scopes=email` because Supabase Azure Auth needs a usable email claim.
- `next` is preserved only when it is a safe same-origin path, such as `/account` or `/team`.
- External redirects are rejected and fall back to `/`.
- OAuth buttons use normal anchors, not client-side route links, so framework prefetching cannot start an OAuth request before the user clicks.

## Error diagnostics

OAuth callback errors redirect to `/auth/callback` with a user-facing `message`. Supabase error bodies are parsed for safe fields including `error_description`, `msg`, `message`, `error`, `error_code`, and `code`. Token-like and secret-like fields are redacted before messages are shown.

## Manual QA checklist

1. Open `https://www.novarn.de/logout`.
2. Open incognito.
3. Open `https://www.novarn.de/login`.
4. Click Google login.
5. Confirm it redirects to `https://www.novarn.de/`.
6. Logout.
7. Open `https://www.novarn.de/account`.
8. Confirm it redirects to `/login?next=%2Faccount`.
9. Click Google login.
10. Confirm it redirects back to `/account`.
11. Repeat for Microsoft login.
12. Confirm email/password login still works.
13. Confirm team invite accept still works.
