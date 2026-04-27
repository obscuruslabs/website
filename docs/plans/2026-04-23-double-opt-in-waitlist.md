# Plan: double-opt-in waitlist

## Why

- Today's flow adds a contact to the Resend audience and sends a passive
  "you're on the list" email on submit. The email lands in Gmail Promotions
  (verified by today's debugging session, see runbooks/2026-04-23-…).
- Switching to double opt-in gives us:
  - a transactional-shaped first email (single CTA, short) that Gmail tab-
    sorters tend to put in Primary
  - cleaner audience (typos and bots can't subscribe)
  - long-term sender-reputation gains
  - implicit legal cover for marketing later
- Decision (with user): grandfather the existing 1 contact; everyone new
  must confirm.

## Architecture

Stateless. Token = HMAC-SHA256 of `{email, exp}` payload, signed with a
new server secret. No database.

### New endpoints
- `POST /api/waitlist` — change behavior: no longer adds to audience.
  Validates email, signs token, sends "click to confirm" email, returns
  `{ ok: true }`.
- `GET /api/waitlist/confirm?token=…` — verifies token, calls
  `addToWaitlistAudience` (idempotent — re-clicks are safe), redirects to
  `/waitlist/confirmed?email=…`. On bad/expired token, redirects to
  `/waitlist/error?reason=…`.

### New pages
- `/waitlist/confirmed` — branded landing matching `/success` style.
  Reads `email` query param, displays it, primary CTA back to `/`.
- `/waitlist/error` — branded landing matching `/cancel` style. Reads
  `reason` query param (`expired` | `invalid`), gives appropriate copy
  and a "try again" CTA back to `/`.

### New lib
- `src/lib/waitlist-token.ts` — `signToken(email)` / `verifyToken(token)`
  using Web Crypto. Edge-compatible. Uses `WAITLIST_TOKEN_SECRET`. 7-day
  TTL.
- `src/lib/emails/waitlist-confirm-link.ts` — short, transactional-style
  email: one paragraph, one button-styled link, no marketing chrome.

### Removed / repurposed
- `src/lib/emails/waitlist-confirmation.ts` — delete. The post-confirm
  experience is the landing page; we no longer send that email.

### Env additions
- `WAITLIST_TOKEN_SECRET` — required at runtime; route fails closed if
  unset. Set as Fly secret on staging + prod independently.
- Updated `.env.example` and `README.md`.

### Validation invariants
- Token shape: `<base64url-payload>.<base64url-signature>`.
- Payload: `{ email: string, exp: number /* unix seconds */ }`.
- `verify` returns `{ email }` only if signature valid AND `exp > now`.
- Subtle.crypto verify is constant-time — no need to roll our own compare.

## Files touched

```
src/
  app/
    api/waitlist/route.ts                  modify  POST handler
    api/waitlist/confirm/route.ts          new     GET handler
    waitlist/confirmed/page.tsx            new     success landing
    waitlist/error/page.tsx                new     error landing
  lib/
    waitlist-token.ts                      new     sign/verify
    emails/waitlist-confirm-link.ts        new     transactional email
    emails/waitlist-confirmation.ts        delete
.env.example                               modify  add WAITLIST_TOKEN_SECRET
README.md                                  modify  document new flow + secret
```

## Rollout

1. Branch `feat/waitlist-double-opt-in` off `main`.
2. PR into `staging`. Merge.
3. **Before deploy lands**: set `WAITLIST_TOKEN_SECRET` on staging Fly app
   (`openssl rand -base64 32`).
4. Smoke: submit on `stg.obscuruslabs.com`, click the link in the inbox,
   confirm landing page renders, confirm contact appears in the Resend
   audience.
5. PR `staging → main`. Merge.
6. **Before prod deploy lands**: set `WAITLIST_TOKEN_SECRET` on prod Fly
   app (different value than staging).
7. Smoke prod: same as staging.

## Out of scope (followups)

- Logging Resend message IDs on success (cheap, do later — should pair
  with a small change to `sendEmail` to return + log the ID).
- Rate limiting `/api/waitlist`. The form is unrate-limited today.
- Backfilling the existing contact with a confirmation prompt — explicitly
  declined per user.
- Adding `List-Unsubscribe` headers — Resend handles this on broadcasts;
  for one-off transactional sends from `resend.emails.send`, worth a
  separate investigation but does not block this work.

## Risks

- **Secret missing on deploy.** The route fails closed and every signup
  silently errors. Mitigation: env presence check in `lib/env.ts` that
  throws at module load if `SITE_MODE` is `coming_soon` (i.e., when the
  waitlist is the primary CTA) and the secret is missing. Better: hard
  require always.
- **Clock skew** between Fly machines and `Date.now()`. Negligible — the
  TTL is 7 days, ±1m skew is fine.
- **Link mangling by mail clients.** Gmail rewrites links for click
  tracking but the rewritten URL still hits our endpoint. Tested implicitly
  by the smoke step.
