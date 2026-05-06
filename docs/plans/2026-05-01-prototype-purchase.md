# Plan: prototype purchase on maintenance page

## Why

- The maintenance page (`SITE_MODE=coming_soon` → `<ComingSoon />`) currently
  exposes only one CTA: the waitlist. We want to give visitors a second path —
  buy an early prototype as the product evolves — at $39 + actual shipping.
- The waitlist side of the requirement is already done. Double-opt-in via
  HMAC tokens and the Resend audience landed in #9 (2026-04-23). No changes
  needed there beyond visual placement.
- Stripe checkout for the production unit (VISO .01 'Ghost', $249, free U.S.
  shipping) is already wired through `/api/checkout` and
  `/api/stripe/webhook`. The prototype is a second SKU sharing the same flow,
  not a new payment system.

## Scope

In:
- Add a `viso-prototype` SKU at $39 with paid shipping.
- Make `/api/checkout` SKU-aware (server-validated, server-priced).
- Surface a prototype CTA on `<ComingSoon />` alongside the waitlist.
- Branch the Stripe webhook order-confirmation email by SKU.
- Wire a `PROTOTYPE_AVAILABLE` env flag for a manual sold-out toggle.

Out (explicit followups, listed below):
- Persistent inventory counter (numbered editions, automatic sold-out).
- Prototype on the full storefront (`SITE_MODE=full`) — coming-soon only for now.
- Carrier-rate shipping; flat rates for v1.
- Distinct prototype variants — assume one model with three photos.

## Architecture

### Product catalog

Today `src/lib/product.ts` exports a single `PRODUCT` constant. Restructure:

```ts
export const PRODUCTS = {
  'viso-ghost': {
    id: 'viso-ghost',
    name: 'VISO .01',
    codename: 'Ghost',
    priceCents: 24900,
    currency: 'usd',
    description: '...',          // existing
    shipping: { kind: 'free' },  // existing semantics
    specs: [...],                // existing
  },
  'viso-prototype': {
    id: 'viso-prototype',
    name: 'VISO Prototype',
    codename: 'Pre-Ghost',
    priceCents: 3900,
    currency: 'usd',
    description: 'A working prototype from the bench. Hand-built, rough edges, full IR emitter array. Numbered, limited.',
    shipping: {
      kind: 'paid',
      rates: [
        { country: 'US', amountCents: 799, label: 'USPS Priority — 3-5 days' },
        { country: 'INTL', amountCents: 1999, label: 'International — 7-14 days' },
      ],
    },
  },
} as const;

export type Sku = keyof typeof PRODUCTS;

// Back-compat alias so existing components don't break this PR.
export const PRODUCT = PRODUCTS['viso-ghost'];
```

This keeps the diff small for existing components. The full storefront's
`Product.tsx`/`BuyButton.tsx` continue to import `PRODUCT` and render the
Ghost; nothing visible changes there.

### Checkout endpoint

`POST /api/checkout` currently hardcodes the Ghost SKU. Two options
considered:

1. New endpoint `/api/checkout/prototype`. Cleanest separation, but doubles
   the Stripe-config surface.
2. Make existing endpoint SKU-aware via request body.

**Pick (2).** Single endpoint, body-driven, server-side catalog lookup. The
client never sends prices; the server is the source of truth.

Request body: `{ sku?: 'viso-ghost' | 'viso-prototype' }`. Default
`'viso-ghost'` for back-compat with existing `<BuyButton />` callers (which
send `POST` with no body). Unknown SKU → 400.

Branching rules inside the route:

| field | Ghost | Prototype |
|---|---|---|
| `mode` | `'payment'` | `'payment'` |
| `unit_amount` | `24900` | `3900` |
| `shipping_address_collection` | yes (US/CA/GB/DE/FR/NL/AU/JP) | same set |
| `shipping_options` | none (free, baked into price) | `[fixed_amount $7.99 US, $19.99 elsewhere]` via two `shipping_rates` IDs created at startup OR inline `shipping_rate_data` |
| `automatic_tax` | enabled | enabled |
| `allow_promotion_codes` | true | **false** (prototype is not on sale) |
| `metadata.sku` | `'viso-ghost'` | `'viso-prototype'` |
| `success_url` / `cancel_url` | same `/success`, `/cancel` | same |
| `line_items[0].adjustable_quantity` | (none) | (none) — exactly 1 |

For `shipping_options`, prefer inline `shipping_rate_data` (no extra Stripe
dashboard config to keep in sync). The country-conditional logic is done by
splitting U.S. into one shipping rate option and international into another —
Stripe shows both at checkout and the user picks. (Stripe doesn't gate
shipping rates by country at session time without a Tax-style integration;
two clearly labelled options is the pragmatic v1.)

If the request hits the route while `PROTOTYPE_AVAILABLE=false`, return
`410 Gone` with `{ error: 'sold out' }`.

### ComingSoon redesign

Current layout (today):

```
[ obscurus labs ]
[ ARRIVING SOON ]
[ "take back your face." ]
[ blurb ]
[ <Waitlist compact /> ]
```

New layout:

```
[ obscurus labs ]
[ ARRIVING SOON ]
[ "take back your face." ]
[ blurb ]
[ ────────────────────────────────────────────── ]
[ Prototype card                | Waitlist card  ]
[ - photo (one of 3 angles)     | - title        ]
[ - $39 + shipping              | - blurb        ]
[ - 1-2 sentence pitch          | - email form   ]
[ - "Buy prototype" button      |                ]
[ - small thumbnail strip (3)   |                ]
[ ────────────────────────────────────────────── ]
```

- Mobile: stacked, prototype first then waitlist.
- The "Buy prototype" button uses `<BuyButton sku="viso-prototype" />`.
- Sold-out state: when `PROTOTYPE_AVAILABLE=false`, render the same card with
  the button disabled, label `[ sold out ]`, and a one-liner pointing to the
  waitlist instead.

### BuyButton

Add a `sku?: Sku` prop, default `'viso-ghost'`. Send it in the POST body.
Auto-default the visible label from the catalog (`[ buy prototype — $39 ]`,
`[ buy now — $249 ]`) unless `label` is overridden.

### Webhook

`/api/stripe/webhook` already handles `checkout.session.completed`. Read
`session.metadata.sku` and pass it to a renamed
`orderConfirmationEmail({ sku, ... })` that branches:

- `viso-ghost` → existing copy ("Your VISO .01 is on the way", 2-day
  assembly, USPS Priority).
- `viso-prototype` → new copy ("Your prototype is queued", "hand-assembled,
  ships within 5 business days", "expect rough edges, that's the point").

Email subject also branches.

### Success / cancel pages

`/success/page.tsx` currently hardcodes "VISO .01 'Ghost'". For v1, soften
the copy so it reads correctly for either SKU ("Your order is in.") and
move SKU-specific shipping/copy into the email rather than the landing
page. `/cancel/page.tsx` is already SKU-agnostic.

(Keeping the success page generic is cheaper than threading SKU into a
post-redirect server component. We don't have the SKU on `/success` without
a Stripe session lookup, and round-tripping for a confirmation page is
overkill.)

### Inventory counter

Confirmed by user: real persistent counter, not just a flag. Constraint: no
DB, no Redis. Stripe is already the source of truth for sales.

Use **Stripe Search API** to count completed prototype sessions and compare
against a configured limit:

- `lib/inventory.ts` exposes `getPrototypeInventory()` returning
  `{ sold, limit, remaining, soldOut }`.
- Implementation:
  `stripe.checkout.sessions.search({ query: "metadata['sku']:'viso-prototype' AND status:'complete'", limit: 100 })`,
  paginating until `has_more === false`. Returns the count.
- 60-second in-memory cache to avoid hitting Stripe on every render. Cache
  invalidated by the webhook when a `checkout.session.completed` for a
  prototype lands.
- Stripe Search has ~1 minute eventual consistency. Webhook invalidation
  closes the gap for sales we observe directly. Manual sales (rare) catch
  up on the next 60-second tick.
- Module-level `let cache: { value, expiresAt } | null` is fine — Fly runs
  one machine for this app (`min_machines_running = 1`, single-region). If
  we scale out, each machine gets its own cache; the worst case is a
  60-second fan-out delay.

Env additions:
- `PROTOTYPE_LIMIT` — integer, the cap. Default `12`.
- `PROTOTYPE_AVAILABLE` — `'true'` | `'false'`, default `'true'`. Kill
  switch that wins over the counter. Use this to pause sales without
  changing the limit (e.g., shipping issues).
- No new third-party secrets. Stripe + Resend already configured.
- Update `.env.example` and `README.md`.

UI surfacing:
- ComingSoon shows `[ N of LIMIT remaining ]` next to the price.
- When sold out (counter at limit OR `PROTOTYPE_AVAILABLE=false`), card
  switches to a sold-out state with "join the waitlist" pointer.
- Checkout API double-checks at session-create time and returns 410 if
  full or paused. The error surfaces in `BuyButton` as "sold out" rather
  than generic "checkout failed".

### Validation invariants

- `/api/checkout` body: `sku` is optional; if present, must be a key of
  `PRODUCTS`. Anything else → 400.
- Prices, shipping, tax flags all come from server catalog. Client never
  sends amounts.
- Quantity is fixed at 1 (no `adjustable_quantity`).
- When `PROTOTYPE_AVAILABLE !== 'true'` and `sku === 'viso-prototype'`, the
  route returns 410 *before* hitting Stripe.

### Files touched

```
src/
  app/
    api/checkout/route.ts                   modify  body-driven SKU branching
    api/stripe/webhook/route.ts             modify  pass SKU into email + invalidate inventory cache
    success/page.tsx                        modify  generic copy (no "VISO .01")
  components/
    ComingSoon.tsx                          modify  prototype + waitlist layout
    BuyButton.tsx                           modify  sku prop, default ghost, 410 → sold-out
    PrototypeCard.tsx                       new     buy CTA + image preview + sold-out + remaining
  lib/
    product.ts                              modify  PRODUCTS catalog, Sku type
    env.ts                                  modify  PROTOTYPE_AVAILABLE + PROTOTYPE_LIMIT
    inventory.ts                            new     Stripe Search counter + 60s cache
    emails/order-confirmation.ts            modify  branch by SKU
public/
  prototypes/prototype-1.jpg                new     from ~/Desktop/ghost-prototype/, compressed
  prototypes/prototype-2.jpg                new
  prototypes/prototype-3.jpg                new
docs/
  plans/2026-05-01-prototype-purchase.md    new     this doc
.env.example                                modify  add PROTOTYPE_AVAILABLE
README.md                                   modify  document SKU + flag
```

## Rollout

1. Branch `feat/prototype-purchase` off `staging`.
2. Pull the three images from `~/Desktop/ghost-prototype/` into
   `public/prototypes/`. Compress each to under 200 KB
   (`pngquant`/`jpegoptim` or just re-export at 85% jpeg, 1600px wide).
3. Implement catalog → endpoint → component changes top-down.
4. Add `PROTOTYPE_AVAILABLE=true` on staging:
   `flyctl secrets set -a obscuruslabs-staging PROTOTYPE_AVAILABLE=true`.
5. Confirm staging is in maintenance: `pnpm maintenance status staging`.
   Flip on if needed: `pnpm maintenance on staging`.
6. Smoke on `stg.obscuruslabs.com`:
   - Both CTAs render (prototype card + waitlist).
   - Click "Buy prototype" → Stripe checkout shows $39 + chosen shipping +
     Stripe Tax. Use test card `4242 4242 4242 4242`.
   - On success, confirm `/success` renders and the prototype-flavored
     email lands.
   - Toggle `PROTOTYPE_AVAILABLE=false`, reload, confirm sold-out state.
     Toggle back to `true`.
   - Submit waitlist email, confirm the existing double-opt-in flow still
     works end to end.
7. Open PR `staging → main`. Set the prod secret:
   `flyctl secrets set -a obscuruslabs PROTOTYPE_AVAILABLE=true`.
8. Smoke prod identically.

## Out of scope (followups)

- **Numbered-edition emails.** Inventory counter is in scope; using its
  position as the edition number ("#3 of 12") in the prototype email is a
  followup — clean once we trust the counter under load.
- **Prototype on full storefront.** When `SITE_MODE=full` we currently show
  only the Ghost. We can add a "prototypes" section to the full site later;
  out of scope here.
- **Real shipping cost.** Flat $7.99 / $19.99 will under-recover for some
  international shipments. Acceptable for prototype scale; revisit when we
  have a real shipping data point.
- **Distinct prototype variants.** Three photos = three angles of one
  model, per current assumption. If we want to sell multiple variants
  (e.g., different lens tints), the catalog already supports it — we just
  add SKUs.
- **Plausible event for "Buy prototype clicked".** Cheap, do later.
- **Stripe Tax registration audit** for $39 SKU. Existing Ghost is already
  on `automatic_tax: true`, so the registration question is the same — just
  worth confirming the origin-state nexus still covers the prototype.

## Risks

- **Race on the last prototype.** Stripe Search has ~1 minute eventual
  consistency, and our cache TTL is 60 seconds. Two near-simultaneous
  buyers at the limit boundary can both succeed. At prototype scale this
  is acceptable — refund + apologize. Mitigations if needed: shorter cache
  TTL, or check Stripe Search inline on the API path (slower).
- **Tax on a low-cost item.** Stripe Tax is enabled. Some U.S. states have
  marketplace nexus rules that change behavior at lower price points; it's
  worth a 5-minute check that we're not surprised.
- **Webhook email regressions.** Splitting `orderConfirmationEmail` to
  branch on SKU is the riskiest part for the existing $249 flow. Keep the
  Ghost branch identical to today's text and run the webhook locally with
  the Stripe CLI to catch shape changes.
- **Image weight.** The three desktop photos are large (~550 KB each
  unmodified). Without compression, the maintenance page bloats. Cap at
  200 KB and run `next/image` with explicit `sizes`.
- **Sold-out UI confusion.** If `PROTOTYPE_AVAILABLE=false` and a stale tab
  POSTs anyway, the API returns 410. The UI must surface that as "sold
  out" rather than a generic "checkout failed". The `BuyButton` error
  branch needs a 410-specific message.
