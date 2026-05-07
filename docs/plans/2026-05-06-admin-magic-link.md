# Plan: admin magic-link auth

## Why

We need a protected `/admin` area for operations like generating
single-use discount codes (so they can't be hoarded and shared online).
Two-person admin (tavinscheffler@gmail.com, jonanscheffler@gmail.com),
no team scaling planned. Goal: zero new third-party dependencies, no
OAuth app to register, no portal to navigate.

We already have:
- HMAC sign/verify with Web Crypto, edge-compatible
  ([src/lib/waitlist-token.ts](../../src/lib/waitlist-token.ts))
- Resend wired and sending transactional email
  ([src/lib/email.ts](../../src/lib/email.ts))
- Middleware-based gating for HTTP requests
  ([src/middleware.ts](../../src/middleware.ts))

Magic links reuse all three. Approximately 80–120 lines of new code.

## Decisions made (don't re-litigate)

- **Two allowlisted emails**: `tavinscheffler@gmail.com`,
  `jonanscheffler@gmail.com`. Comma-separated `ADMIN_EMAILS` env var,
  case-insensitive compare.
- **Stateless** sessions (HMAC-signed cookie). No DB. Revoke by
  rotating the session secret — kills *all* sessions, fine for two
  users.
- **Two distinct secrets**, separate from the waitlist secret:
  - `ADMIN_TOKEN_SECRET` — signs the one-time login link
  - `ADMIN_SESSION_SECRET` — signs the session cookie
  Cross-token forgery (waitlist→admin or login-link→session) is
  impossible without the right secret.
- **Login-link TTL**: 30 minutes.
- **Session TTL**: 30 days.
- **No replay denylist** for login links — accept that clicking a fresh
  link twice just creates two valid sessions to the same email.
  Trade-off documented in Risks.
- **Quiet allowlist** — `/admin/login` always responds "if that email
  is authorized, check your inbox," regardless of whether the email is
  in the allowlist. Don't leak who can log in.

## Architecture

### Token primitives

Mirror `waitlist-token.ts` exactly, with separate secrets:

- `src/lib/admin-token.ts`
  - `signLoginToken(email)` → token string, payload `{ email, exp }`,
    signed with `ADMIN_TOKEN_SECRET`, 30 min TTL.
  - `verifyLoginToken(token)` → `{ ok: true, email } | { ok: false, reason: 'invalid' | 'expired' }`.
- `src/lib/admin-session.ts`
  - `signSession(email)` → token, payload `{ email, exp }`,
    `ADMIN_SESSION_SECRET`, 30 day TTL.
  - `verifySession(token)` → same shape.
  - Read/write the cookie via `next/headers` cookies + `NextResponse`.

Web Crypto only — edge-compatible so middleware can call `verifySession`.

### Allowlist

`src/lib/admin-allowlist.ts`:

```ts
export function isAdminAllowed(email: string): boolean {
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.trim().toLowerCase());
}
```

Read at request time (no module-level caching) so a Fly secret flip
takes effect on next request.

### Routes

| Route | Handler | Behavior |
|---|---|---|
| `GET /admin/login` | server component | If session cookie is valid, redirect to `/admin`. Otherwise render the form. Reads `?sent=1` to show "check your inbox" confirmation. Reads `?error=expired` to show "that link has expired, try again." |
| `POST /admin/login` | route handler | Validates email shape. If `isAdminAllowed`, signs login token, sends email via Resend. If not, *silently does nothing*. Always redirects to `/admin/login?sent=1`. |
| `GET /admin/auth/verify?token=…` | route handler | Verifies token. On success, set session cookie + redirect `/admin`. On expired, redirect `/admin/login?error=expired`. On invalid, redirect `/admin/login?error=invalid`. |
| `POST /admin/logout` | route handler | Clears session cookie, redirects `/admin/login`. POST so accidental link prefetches don't log out. |
| `GET /admin/*` | server component | Anything else under `/admin` requires session. Middleware redirects to `/admin/login` if absent/invalid. |

### Middleware

Extend `src/middleware.ts`. Order:

1. The existing webhook-bypass for `/api/stripe/webhook` stays first
   (Stripe must reach it without basic auth or session).
2. Existing basic auth on staging applies to everything except the
   webhook (unchanged).
3. New: when `pathname.startsWith('/admin')` AND not in
   `['/admin/login', '/admin/auth/verify']`:
   - Read `admin_session` cookie.
   - `verifySession(token)` — re-check email against current
     `isAdminAllowed` so removing someone from the allowlist kicks
     them out on next request without a redeploy.
   - On any failure, `NextResponse.redirect('/admin/login')`.

The path allowlist (`/admin/login`, `/admin/auth/verify`) keeps the
sign-in flow itself reachable.

### Email template

`src/lib/emails/admin-magic-link.ts`. Mirror
`waitlist-confirm-link.ts` style — single button, transactional shape.

Subject: `Sign in to obscurus labs admin`.
Body: brief sentence + button labeled "Sign in" pointing to
`${SITE_URL}/admin/auth/verify?token=…`.

Plain-text version included so deliverability stays clean.

### Cookie

```
Name:     admin_session
HttpOnly: yes
Secure:   true in production
SameSite: Lax
Path:     /
Max-Age:  60 * 60 * 24 * 30
```

`SameSite=Lax` over `Strict` so navigations from email clients work
without quirks; the cookie isn't sent on cross-site form submits, which
is what matters for CSRF.

### Files touched

```
src/
  app/
    admin/
      page.tsx                                 new   placeholder admin home
      layout.tsx                               new   minimal admin chrome
      login/
        page.tsx                               new   form + status messaging
        actions.ts                             new   server action for POST
      auth/verify/route.ts                     new   GET handler for magic link
      logout/route.ts                          new   POST handler
  lib/
    admin-token.ts                             new   sign/verify login link
    admin-session.ts                           new   sign/verify + cookie helpers
    admin-allowlist.ts                         new   env-driven check
    emails/admin-magic-link.ts                 new   transactional email
  middleware.ts                                modify  /admin gate
.env.example                                   modify  add 3 vars
README.md                                      modify  document setup + flow
docs/plans/2026-05-06-admin-magic-link.md      new     this doc
```

### Validation invariants

- Login token shape: `<base64url-payload>.<base64url-signature>`,
  payload `{ email: string, exp: number }`.
- `verifyLoginToken` returns `{ email }` only if signature valid AND
  `exp > now` AND email parseable. Constant-time compare via
  `crypto.subtle.verify`.
- Session token shape identical, signed with a *different* secret.
- Cookie name `admin_session` cannot be confused with anything else
  (no other auth cookies exist today).
- Middleware's allowlist check runs on *every* `/admin/*` request, so
  removing a user from `ADMIN_EMAILS` takes effect within one request.

## Rollout

1. Branch `feat/admin-magic-link` off `staging`.
2. Implement, typecheck, lint.
3. **Before merge**, set staging Fly secrets:
   ```bash
   flyctl secrets set -a obscuruslabs-staging \
     ADMIN_EMAILS="tavinscheffler@gmail.com,jonanscheffler@gmail.com" \
     ADMIN_TOKEN_SECRET="$(openssl rand -base64 32)" \
     ADMIN_SESSION_SECRET="$(openssl rand -base64 32)"
   ```
4. Open PR `feat/admin-magic-link` → `staging`. Merge.
5. Smoke staging:
   - Visit `stg.obscuruslabs.com/admin` → redirected to `/admin/login`.
   - Submit `jonanscheffler@gmail.com` → "check your inbox" + email
     arrives within seconds.
   - Click the link → land on `/admin`, session cookie set.
   - Reload `/admin` → still authenticated.
   - Submit `nope@example.com` → identical "check your inbox" message,
     **no email sent** (verify Resend logs).
   - Wait for an expired link, click it → redirected to
     `/admin/login?error=expired` with friendly copy.
   - POST `/admin/logout` → cookie cleared, next visit redirects to
     login.
6. Set prod Fly secrets (different values per env), PR `staging → main`,
   merge, smoke prod identically.

## Out of scope (followups)

- **The admin UI itself**: single-use discount-code generation, recent
  sales list, sold-out toggle, limit slider. Separate plan & PR.
- **Multi-factor**: magic link is one factor; for two trusted admins
  on a low-stakes site, sufficient. Add TOTP/passkeys later if scope
  expands.
- **Login-link denylist for replays**: short TTL + small allowlist
  makes this not worth the storage layer.
- **Audit log of admin actions**: nice-to-have once the admin UI does
  things worth logging. Out of this PR.
- **"Remember me" toggle**: 30 days is the default, no opt-out needed.

## Risks

- **Replay**: a magic link can be redeemed twice within its TTL. Two
  sessions to the same email isn't a privilege escalation — the
  attacker would need to have the email already. Acceptable.
- **Email delay**: a delayed email might arrive after the 30 min TTL.
  Mitigation: friendly "expired, try again" copy on
  `/admin/login?error=expired`. If we observe this happening in
  practice, raise to 60 min — one-line change.
- **Token in URL**: magic-link tokens appear in browser history and
  potentially in HTTP referrers / proxy logs. Mitigations:
  short TTL (30 min), single-purpose secret (cross-token forgery
  blocked), and we don't include `?token=` in any redirect target —
  the verify handler responds with a redirect to `/admin` after
  consuming the token.
- **Secret rotation = global logout**: rotating `ADMIN_SESSION_SECRET`
  invalidates every active session. This is the intended emergency
  lever, not a regular operation. Documented.
- **Allowlist drift**: someone removed from `ADMIN_EMAILS` while
  logged in continues to have a valid signed cookie. Middleware
  re-checks allowlist on every request, so they're kicked on the next
  page load — within seconds.
- **Phishing**: emails could be forwarded. Mitigation: link only
  works at `obscuruslabs.com/admin/auth/verify`, hard to spoof. Worth
  a one-line "we never ask for this code; ignore if you didn't
  request" line in the email body.
- **Brute-force on `/admin/login`**: someone hitting POST repeatedly
  with random emails. Resend has its own rate limit per account.
  Worth adding a simple per-IP bucket limiter (10/hour) before
  shipping if we observe traffic. Out of scope unless we see it.
