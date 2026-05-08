# Plan: admin magic-link authentication

## Why

We just shipped recurring percent-off codes (`PROTO5/10/15/20/25`).
Those are going to leak the moment one is shared anywhere public —
once the URL is on Reddit, the cap is moot. The right answer is
single-use, operator-issued codes generated from an admin area, not
five forever-codes baked into Stripe.

Before we can build that admin area we need an auth layer for it.
Two operators (tavin, jonan), no third-party identity provider, no
OAuth app to register. Magic links are the cleanest fit: typed-email
→ emailed link → clicked → session cookie. We already have the two
primitives this needs — HMAC token sign/verify (`waitlist-token.ts`)
and Resend transactional email (`waitlist-confirm-link.ts`).

This PR is auth only. The admin UI itself (single-use code generation,
sales list, kill-switch toggle) is a follow-up plan.

## Decisions

- **Allowlist of two emails**, env-driven:
  `ADMIN_EMAILS=tavinscheffler@gmail.com,jonanscheffler@gmail.com`.
  Adding a third operator is a Fly secret edit, no deploy needed.
- **Two HMAC secrets**, distinct from `WAITLIST_TOKEN_SECRET` and
  distinct from each other:
  - `ADMIN_TOKEN_SECRET` — signs the 30-min magic link.
  - `ADMIN_SESSION_SECRET` — signs the 30-day session cookie.
  Different secrets so a leak of one doesn't impersonate via the
  other, and so rotating session secrets (forcing logout) is
  independent of rotating link secrets.
- **30-minute magic-link TTL.** Long enough that switching tabs or
  retrieving the email later in the same coffee won't expire it,
  short enough that a stolen link is short-lived. (Confirmed.)
- **30-day session.** A working session shouldn't make me re-email
  myself every day. Re-checked against the allowlist on every
  request, so removing an operator from `ADMIN_EMAILS` kicks them
  within one request even if their session cookie hasn't expired.
- **Quiet allowlist.** Submitting any syntactically valid email to
  `/admin/login` returns the same "check your inbox" response. Only
  allowlisted emails actually receive an email. We log the
  non-allowlisted attempt for ops, but the response shape is
  identical. Tradeoff: a real operator who fat-fingers their email
  gets a silent failure (no inbox arrives, no error UI). Acceptable
  in exchange for not leaking who can log in. (Confirmed.)
- **Stateless session.** No database. Cookie *is* the record:
  `<base64url(payload)>.<base64url(sig)>` over HMAC-SHA256, payload
  `{ email, exp }`. Same shape as the waitlist token, different
  TTL and secret.
- **Edge-compatible crypto only.** `src/middleware.ts` runs at the
  edge; both libs use Web Crypto, no Node-only deps.

## Architecture

### Token primitives

```
src/lib/admin-token.ts    — sign/verify 30-min login link
src/lib/admin-session.ts  — sign/verify 30-day session, cookie helpers
```

Both are near-clones of `src/lib/waitlist-token.ts` with a different
default TTL and a different env-var-named secret. The session lib
also exposes `setSessionCookie(res, email)` and
`clearSessionCookie(res)` so route handlers don't need to know cookie
attributes (`HttpOnly; Secure; SameSite=Lax; Path=/admin`).

### Allowlist helper

```
src/lib/admin-allowlist.ts
```

Reads `ADMIN_EMAILS` at request time (so a Fly secret flip takes
effect without redeploying), splits on commas, trims, lowercases.
Single export `isAdmin(email: string): boolean` does a
case-insensitive equality check. No regex / glob matching — explicit
list only.

### Login flow

```
src/app/admin/login/page.tsx       — form + status banner
src/app/admin/login/actions.ts     — server action: validate, sign, send
src/app/admin/auth/verify/route.ts — GET handler: verify, set cookie
src/app/admin/logout/route.ts      — POST handler: clear cookie
src/lib/emails/admin-magic-link.ts — transactional template
```

1. `GET /admin/login` — form with one input (email) and a submit
   button. Reads `?sent=1` and `?error=expired|invalid` to render a
   status banner above the form.
2. Server action POST: validates email shape; if `isAdmin(email)`,
   signs an `admin-token` (30 min, payload `{ email, exp }`),
   composes magic link `${SITE_URL}/admin/auth/verify?token=…`,
   sends via Resend; otherwise no-ops (still logs). Either way
   redirects to `/admin/login?sent=1`.
3. `GET /admin/auth/verify?token=…` — verifies the token. If valid
   and the email is *still* in the allowlist (re-check, don't trust
   what was signed if the allowlist has shrunk since), sets the
   session cookie and redirects to `/admin`. If invalid or expired,
   redirects to `/admin/login?error=<reason>`.
4. `POST /admin/logout` — clears the cookie, redirects to
   `/admin/login`.

### Middleware gate

`src/middleware.ts` already enforces optional basic auth and the
Stripe webhook bypass. Add a third concern *after* basic auth (so
staging's preview-realm gate still wraps everything):

```
if path starts with /admin
  if path is /admin/login or /admin/auth/verify or /admin/logout
    pass through
  else
    read session cookie
    if absent or invalid or email no longer in allowlist
      redirect to /admin/login
```

The "re-check allowlist on every request" matters: it's the only way
removing an operator from `ADMIN_EMAILS` actually kicks them, since
sessions are stateless. Cheap — it's a string split + linear scan.

### Files touched

```
src/
  app/
    admin/
      layout.tsx                     new   minimal chrome
      page.tsx                       new   placeholder admin home
      login/
        page.tsx                     new   form + status banner
        actions.ts                   new   server action
      auth/verify/
        route.ts                     new   GET handler
      logout/
        route.ts                     new   POST handler
  lib/
    admin-token.ts                   new   sign/verify magic link
    admin-session.ts                 new   sign/verify session + cookie helpers
    admin-allowlist.ts               new   isAdmin()
    emails/
      admin-magic-link.ts            new   transactional template
  middleware.ts                      modify  add /admin gate after basic auth
.env.example                         modify  add 3 new vars
README.md                            modify  document setup + flow
docs/plans/2026-05-06-admin-magic-link.md   new   this file
```

## Validation invariants

- `ADMIN_TOKEN_SECRET`, `ADMIN_SESSION_SECRET`, and
  `WAITLIST_TOKEN_SECRET` are three distinct values per environment.
  The seed instructions emit three separate `openssl rand -base64 32`
  calls so it's hard to copy-paste the same one twice.
- The session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/admin`.
  Path scoping means it's not sent to the marketing site or the
  Stripe webhook.
- The login response is identical for allowlisted and non-allowlisted
  emails. Test fixture: send to `nope@example.com`, confirm Resend
  logs show no message dispatched.
- The allowlist is re-checked on every authenticated request via
  middleware, *not* trusted from what was signed into the session.
  Test fixture: log in as jonan, then remove jonan from
  `ADMIN_EMAILS`, then refresh → bounced to `/admin/login`.
- The expired-link path renders friendly copy
  (`/admin/login?error=expired`), not a generic 401. Test fixture:
  craft a token with `exp` in the past, hit `/admin/auth/verify`.
- `POST /admin/logout` clears the cookie and bouncing back to
  `/admin` redirects to `/admin/login`. No "remember me" mechanism
  beyond the 30-day session itself.
- The Stripe webhook still bypasses everything. Existing test:
  `curl https://stg.obscuruslabs.com/api/stripe/webhook` returns 400
  (Stripe signature missing), not 401.

## Rollout

1. Branch `feat/admin-magic-link` off `staging`.
2. Implement, `pnpm typecheck`, `pnpm lint`.
3. Verify locally on Node 22 (`.nvmrc` pins this; the launch config
   in `.claude/launch.json` runs `nix shell nixpkgs#nodejs_22`).
   Real Resend send to a personal address — full click-through
   matters more than curl.
4. PR `feat/admin-magic-link → staging`.
5. **Before merge**, set staging Fly secrets:
   ```bash
   flyctl secrets set -a obscuruslabs-staging \
     ADMIN_EMAILS="tavinscheffler@gmail.com,jonanscheffler@gmail.com" \
     ADMIN_TOKEN_SECRET="$(openssl rand -base64 32)" \
     ADMIN_SESSION_SECRET="$(openssl rand -base64 32)"
   ```
6. Merge → staging deploys. Smoke `stg.obscuruslabs.com/admin`
   (basic auth `preview` / "tavin is smart" first, then magic
   link inside).
7. Stop and ask the operator before promoting to prod.
8. On approval: set prod Fly secrets with **different** random
   values, PR `staging → main`, merge, smoke prod identically.

## Out of scope

- **The admin UI itself.** This PR ships an empty `/admin` shell.
  Next plan: single-use discount-code generation, sales list view,
  prototype kill-switch toggle.
- **MFA / WebAuthn.** Two operators with magic-link-to-Gmail is fine
  for the size of the surface area. Revisit if the surface grows.
- **Audit log.** No log of admin actions yet. Will be relevant when
  the admin UI lands; trivial to add then.
- **Replay denylist.** A magic link is *technically* multi-use within
  its 30-minute window. Adding a one-shot denylist requires a
  database — not worth it at two-operator scale. The 30-min window
  is the mitigation.
- **Email rate limiting.** Sustained POSTs to `/admin/login` could
  flood Resend or the operator's inbox. The basic-auth wrapper on
  staging mitigates this; on prod the `/admin` URL is unadvertised.
  If it becomes a problem, add per-IP throttling like the discount
  lookup uses.
- **Customizable session lifetime.** 30 days is hardcoded. Easy to
  surface as an env var if it ever matters.

## Risks

- **Email deliverability.** If the magic link lands in spam, the
  operator can't log in. Mitigation: the email is transactional-
  shaped (one short paragraph, one CTA, no marketing chrome) — same
  shape as the waitlist confirmation, which delivers cleanly. The
  `From` address is the same `hello@obscuruslabs.com` that already
  has good reputation.
- **Lost link → can't log in.** If Resend has a sustained outage,
  there's no alternate path. Acceptable: the admin area isn't on
  the critical sales path; the public site keeps working without
  it. If we ever need an emergency-bypass, it'd be a `flyctl ssh
  console` printing a one-off link.
- **Stale session after revoking access.** Cookies are stateless
  and the session secret isn't rotated on every login. Mitigation:
  the allowlist re-check happens on every request, so the immediate
  way to kick someone is to remove them from `ADMIN_EMAILS`.
  Catastrophic case (session-secret compromise) is "rotate
  `ADMIN_SESSION_SECRET` on Fly — every operator logs in again."
- **Scope creep into the admin UI.** Easy to start adding pages
  inside `/admin` because the shell is right there. Resist; the
  admin UI deserves its own plan and PR so trade-offs are visible.
- **Replay window.** A 30-min link clicked twice will succeed twice
  (no denylist). Acceptable at this scale; the practical attack is
  "an attacker with read access to the operator's email," which is
  game over for far worse reasons.
