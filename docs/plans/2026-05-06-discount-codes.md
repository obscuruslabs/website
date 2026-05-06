# Plan: discount codes for prototype

## Why

We want five percent-off discount tiers on the prototype SKU — 5%, 10%,
15%, 20%, 25% — to share via email and social. Two complementary use
patterns:

- **Type-at-checkout** — customer pastes a code into the Stripe-hosted
  Checkout page. Built into Stripe; we currently have it disabled on
  prototype (`allow_promotion_codes: false` because the original
  decision was "prototype isn't on sale"). That decision changes.
- **Shareable link** — `obscuruslabs.com/?code=FRIEND10` auto-applies
  the discount, shows a banner, and the customer never types anything.

Both flows ride the same Stripe Promotion Codes primitive — no new
discount engine on our side. Stripe is the source of truth for which
codes exist, what they're worth, and when they expire.

## Decisions (already made)

- **Percent-off, not dollar-off** — 5/10/15/20/25%.
- **Prototype only** — codes do not apply to the Ghost (when the full
  storefront launches). Enforced two ways: at the API layer (we don't
  attach a code if `sku !== 'viso-prototype'`) and on the Stripe coupon
  itself (`applies_to.products: [<prototype product id>]`).
- **Both flows shipped together** (type-at-checkout + URL auto-apply).

## Decisions (need from operator before merge)

- **Code strings.** Defaults proposed: `PROTO5`, `PROTO10`, `PROTO15`,
  `PROTO20`, `PROTO25`. Override via the setup script if you want
  themed codes (`FRIEND10`, `LAUNCH25`, etc).
- **Per-code redemption caps.** Default proposal: unlimited for the
  smaller discounts, `max_redemptions=10` for `PROTO20` / `PROTO25` so
  a leaked link can't drain the run. Override per code.
- **Expiry.** Default: no expiry. Override per code via `expires_at`.

These can change later without code changes — they live in Stripe.

## Architecture

### Stripe-side setup (one-time)

Run a small script (`scripts/seed-discounts.mjs`) that:

1. Creates a stable Stripe Product `prod_…_prototype` if missing
   (currently the code uses inline `price_data.product_data` which
   creates a throwaway product on every session — that defeats
   `applies_to.products` restrictions). Persists the resulting product
   ID via `flyctl secrets set STRIPE_PROTOTYPE_PRODUCT_ID=prod_…` on
   both apps.
2. For each of the five tiers, creates a coupon
   (`percent_off: 5/10/15/20/25`, `duration: once`,
   `applies_to: { products: [<prototype product id>] }`) and a matching
   promotion code (string from operator config, defaults above).
3. Idempotent: skips creation if a coupon with the same `name` already
   exists; skips a promo code if `code` already exists. Re-running the
   script after a partial failure is safe.

### Catalog change

Add `stripeProductId?: string` to `ProductDef` in `lib/product.ts`.
Read at request time from `process.env.STRIPE_PROTOTYPE_PRODUCT_ID`.
Used by `/api/checkout` to switch line-item construction:

- If product ID is set: `price_data: { currency, unit_amount, product: <id> }`.
- If unset (dev / first deploy before script ran): fall back to today's
  `product_data` form, which still works but won't honor product-scoped
  coupons. Logs a one-line warning.

### Layer 1 — type at checkout

One-line config change in `/api/checkout`:

```diff
-      allow_promotion_codes: sku === 'viso-ghost',
+      allow_promotion_codes: true,
```

Stripe-hosted Checkout shows the "Add promotion code" link, validates
typed codes, applies the discount inline. No new client code needed.

### Layer 2 — shareable links + auto-apply

#### Visit lands with `?code=PROTO10`

`page.tsx` is already `force-dynamic`. On request, read
`searchParams.code`, normalize uppercase, look it up via
`stripe.promotionCodes.list({ code, active: true, limit: 1 })`. If the
code exists and (a) is active, (b) hasn't expired, (c) the underlying
coupon's `applies_to.products` includes the prototype product — set a
`discount_code` cookie (7-day expiry, secure on prod, lax-samesite,
HttpOnly so the client can't read it but the server reads it on every
nav). If the code is invalid, do nothing (don't reveal whether codes
exist via UI difference; just log for ops).

The cookie carries the code string only — not the discount amount.
Every server render that needs the discount looks up the cookie value
against Stripe (with a 60s in-memory cache keyed on the code, similar
to `inventory.ts`).

#### Banner on `<ComingSoon />`

New server component `<DiscountBanner />` near the top of the page (or
inline above the prototype card). Reads the cookie, looks up the
percent-off and code name, renders:

```
[ Code PROTO10 applied — 10% off your prototype ]   [ ✕ remove ]
```

The remove button hits a tiny `POST /api/discount/clear` route that
unsets the cookie and revalidates.

#### `BuyButton` carries the code through

The button posts to `/api/checkout` with `{ sku, code }`. Code comes
from a non-HttpOnly companion cookie (`discount_code_visible=PROTO10`)
or a server-rendered hidden input — leaning hidden input since it
avoids the dual-cookie state.

Actually simpler: read the cookie *server-side* in
`<PrototypeCard />` and pass `code` as a `data-code` attribute or a
prop to `BuyButton` so the client doesn't need cookie access at all.

#### `/api/checkout` validates and attaches

```ts
let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
if (sku === 'viso-prototype' && body.code) {
  const pc = await lookupPromoCode(body.code);
  if (pc) discounts = [{ promotion_code: pc.id }];
  else console.warn('[checkout] invalid promo code passed', { code: body.code });
}
```

Pass `discounts` into the session. `allow_promotion_codes` and
`discounts` can coexist — but only if `discounts` is empty. So we set
`allow_promotion_codes: discounts ? false : true` (Stripe constraint:
can't have both at once on a session). Customer with an auto-applied
code can't override; without one, they can type one. That's fine.

#### Files touched

```
src/
  app/
    api/checkout/route.ts         modify  accept code, validate, attach discount
    api/discount/clear/route.ts   new     POST clears cookie, redirects
    page.tsx                       modify  read ?code=, set cookie, validate
  components/
    BuyButton.tsx                  modify  accept code prop, send in body
    PrototypeCard.tsx              modify  read cookie, pass code to BuyButton
    DiscountBanner.tsx             new     show "Code X applied — N% off" + clear
    ComingSoon.tsx                 modify  render <DiscountBanner /> near top
  lib/
    discount.ts                    new     Stripe lookup + 60s cache
    product.ts                     modify  add stripeProductId from env
    env.ts                         modify  add STRIPE_PROTOTYPE_PRODUCT_ID
scripts/
  seed-discounts.mjs               new     one-time bootstrap of product + coupons + codes
docs/
  plans/2026-05-06-discount-codes.md  new  this file
README.md                          modify  document discount setup + flow
.env.example                       modify  add STRIPE_PROTOTYPE_PRODUCT_ID
```

## Validation invariants

- The client *never* tells the server how big a discount is. Server
  asks Stripe.
- A code passed via body for `sku === 'viso-ghost'` is silently
  dropped at the API layer — extra defense alongside Stripe's
  `applies_to.products` check.
- A code that's expired, exhausted, or restricted to a different
  product is dropped, the buy still proceeds at full price, and we log
  for ops. We do *not* reject the buy — that's worse UX than just
  ignoring the bad code.
- Cookie is `Secure` + `SameSite=Lax`. Domain not pinned (works on
  `obscuruslabs.com` and `stg.obscuruslabs.com` independently).
- Stripe Promotion Code lookup is rate-limited per-IP (cheap in-memory
  bucket, not an attack-grade limiter — just stops us from melting
  Stripe if someone scripts `?code=` against our homepage).

## Rollout

1. Branch `feat/discount-codes` off `staging`.
2. Implement, typecheck, lint.
3. Run `node scripts/seed-discounts.mjs` against the **test** Stripe
   account. Captures the prototype product ID; print it for
   `flyctl secrets set -a obscuruslabs-staging STRIPE_PROTOTYPE_PRODUCT_ID=prod_…`.
4. PR into `staging`, merge, wait for deploy.
5. Smoke staging:
   - Plain `/` — no banner, prototype card unchanged.
   - `/?code=PROTO10` — banner appears, count still 12/12.
   - `[Buy prototype]` → Stripe Checkout shows $39 line item + 10% off line.
   - Try a typo `?code=NOPE` — no banner, no error, buy works at full
     price. Server logs the invalid attempt.
   - Type `PROTO15` directly on Stripe-hosted page — accepted, applied.
6. Run `node scripts/seed-discounts.mjs` against the **live** Stripe
   account. Captures the live prototype product ID;
   `flyctl secrets set -a obscuruslabs STRIPE_PROTOTYPE_PRODUCT_ID=prod_…`.
7. PR `staging → main`, merge, watch deploy.
8. Smoke prod identically.

## Out of scope

- **Stacking codes.** Stripe allows multiple discounts on one session
  via `discounts: [a, b]`, but the UX gets confusing and we'd need
  rules. One code at a time for now.
- **Per-customer caps.** Stripe's `restrictions.first_time_transaction`
  only applies to subscriptions. For one-shot purchases, the only
  available restriction is `max_redemptions` (global). If we want
  "1 per customer," that needs a real customer record + checkout-side
  lookup. Defer.
- **Bulk code generation UI.** The setup script handles the five
  named codes; bigger campaigns can use Stripe Dashboard or extend the
  script. No admin UI on our side.
- **Referral codes.** Where buyer A's code earns A a credit when B
  buys. Different mechanism — needs customer records and credit
  tracking. Defer.
- **Showing the discounted price on the maintenance page itself.**
  Today the page shows `$39` and the discount only appears on Stripe
  Checkout. We *could* compute and render `$35.10 (10% off)` server-
  side once the cookie is set, but that requires a Stripe lookup on
  every render. The 60s cache on lookup helps, but it's still a
  noticeable change. Recommend showing the *banner* and the *original
  price* on the homepage; the discount applies at Stripe. Easy
  followup if you want the price flash.

## Risks

- **Code leakage.** A single share post can broadcast the URL to
  thousands. Mitigation: `max_redemptions` on the higher tiers
  (default proposal: unlimited for 5/10/15, capped for 20/25).
  Operator can rotate codes by deactivating one in Stripe Dashboard
  and seeding a new one.
- **Stripe API rate limits on `promotionCodes.list`.** Each render of
  `/?code=…` does one lookup. Cached for 60s per code. Sustained
  traffic on bogus codes (e.g., `?code=A`, `?code=B`, …) could blow
  past the cache because each new string is a cache miss. Add the
  per-IP rate limiter mentioned above; it caps the damage.
- **Cookie privacy posture.** Setting a cookie based on a URL param
  is tracking-adjacent. Worth noting in the privacy page (the
  `(legal)` route group already exists). Cookie carries no PII —
  just an opaque marketing code.
- **Coupon migration if we change the product later.** If we replace
  `prod_…_prototype` with a new product (e.g., for a "v2 prototype"),
  every coupon's `applies_to.products` needs updating, otherwise
  codes silently stop working. Easy to forget. Mitigation: bake the
  product ID lookup into the seed script so re-running it always
  reattaches.
- **Auto-apply vs typing — UX collision.** Stripe disallows
  `discounts` + `allow_promotion_codes` on the same session. We pick:
  if a code is auto-applied, the customer can't type a *different*
  one. If they want a different one, they'd need to land at
  `?code=OTHER` instead. Acceptable; document.
