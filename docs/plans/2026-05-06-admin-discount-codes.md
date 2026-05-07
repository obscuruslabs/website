# Plan: admin-generated single-use discount codes

## Why

The current discount system (`PROTO5/10/15/20/25`, recurring codes
shipped in #14) is leak-bait — the same code with unlimited or
high-cap redemptions broadcasts on the internet the moment it's used
in public. The right pattern for a small-volume, hand-built prototype
run is single-use codes generated on demand from an authenticated
admin area, with the percent and (optional) expiry chosen at
generation time.

This plan replaces the recurring-codes system. It is the first feature
to live behind magic-link auth (see
`2026-05-06-admin-magic-link.md`).

## Decisions (locked in with user)

1. **Code format — optional prefix.** Form has a `prefix` text input,
   blank by default. If blank, Stripe auto-generates the code
   (uppercase alphanumeric, ~8 chars). If present, we generate
   `<PREFIX><8-char-random>` ourselves and pass to Stripe. Examples:
   `01R7K7VV` (no prefix) or `GIFT-AB3K9Z` (prefix `GIFT-`). Stripe
   accepts both shapes; promotion-code lookup is case-insensitive on
   entry.
2. **Percent cap — none.** Stripe has no native cap and we trust the
   two admins. The create-success state shows the percent prominently
   so a typo is visible immediately and a one-click deactivate is
   right there. (If the user reverses this later, a soft cap is a
   one-line change.)
3. **Default expiry — 30 days from creation.** Form has an expiry
   date input that defaults to today + 30 days; admin can change or
   clear ("no expiry").
4. **Decommission `PROTO5/10/15/20/25` in the same release.** A
   one-shot script runs against test Stripe after the staging deploy
   lands, then against live Stripe after the prod deploy lands.
   Deactivated promo codes can't be re-enabled by Stripe — accepted.
5. **Notes field — required.** Free text, max 80 characters, stored
   in `metadata.note` on both the coupon and the promotion code.
   Visible in the admin list.
6. **Sales reconciliation panel — yes, in this PR.** Admin home also
   shows recent prototype sales (count, gross, net of discounts,
   recent buyer emails) pulled from Stripe.

## Decisions made (don't re-litigate)

- **Single-use means `max_redemptions: 1`.** First buyer wins; after
  that the code is dead.
- **One coupon + one promotion code per generated code.** A 1:1 pair
  per "gift" we hand out. Slightly more Stripe records than reusing
  one coupon per percent tier, but the data model is dead simple
  (each generated code is one self-contained pair). If Stripe records
  grow uncomfortable later we can refactor to coupon-per-percent —
  out of scope here.
- **Admin auth via magic link** (`aelix-zwk`). This plan strictly
  depends on that landing first.
- **The public buy path is unchanged.** Today's `/api/checkout`
  validates *any* promotion code via Stripe — single-use or recurring
  — and the prototype-only enforcement at the API layer
  (`sku === 'viso-prototype'`) plus the coupon's
  `applies_to.products` restriction are already correct. No changes
  to the buyer-side flow.
- **Same shareable URL pattern.** A generated code `4F2K9XAB` is
  sharable as `https://obscuruslabs.com/?code=4F2K9XAB` exactly like
  PROTO10 was. Banner + auto-apply already work for any code.

## Architecture

### Library

`src/lib/admin-codes.ts` — small, focused helpers:

```ts
export type GeneratedCode = {
  code: string;            // the customer-facing string
  promoId: string;         // pc_…
  couponId: string;        // cou_…
  percentOff: number;
  expiresAt: number | null;
  note: string;
  shareUrl: string;        // SITE_URL + '/?code=' + code
};

export async function createSingleUseCode(args: {
  percentOff: number;
  expiresAt?: number;     // unix seconds; undefined = no expiry
  note: string;
  createdByEmail: string;
}): Promise<GeneratedCode>;

export type ListedCode = GeneratedCode & {
  active: boolean;
  redeemed: boolean;
  timesRedeemed: number;
  createdAt: number;       // unix seconds
  createdByEmail: string;
};

export async function listRecentCodes(limit?: number): Promise<ListedCode[]>;

export async function deactivateCode(promoId: string): Promise<void>;
```

`createSingleUseCode` does:
1. Validate percent in [1, 100] and note non-empty after trim.
2. `stripe.coupons.create({ percent_off, duration: 'once', applies_to: { products: [STRIPE_PROTOTYPE_PRODUCT_ID] }, name: 'Single-use ${percentOff}%', metadata: { kind: 'single-use', created_by: email, note } })`.
3. If `prefix` is provided: generate `<PREFIX><8 random alphanumeric>`
   and pass as `code:` to Stripe. Otherwise omit `code:` and let
   Stripe generate.
4. `stripe.promotionCodes.create({ promotion: { type: 'coupon', coupon: couponId }, max_redemptions: 1, expires_at, code, metadata: { kind: 'single-use', created_by: email, note } })`.
5. Return the pair + share URL.

`listRecentCodes`:
- `stripe.promotionCodes.list({ limit, expand: ['data.promotion.coupon'] })`.
- Filter `metadata.kind === 'single-use'` so the recurring `PROTO*` codes don't pollute the list.
- Return shape includes `active` (from Stripe), `times_redeemed`, `redeemed = times_redeemed >= 1`.

`deactivateCode`:
- `stripe.promotionCodes.update(id, { active: false })`. Stripe disallows deletion. The promo code stays in history but can't be claimed.

### Routes / pages

```
src/app/admin/
  page.tsx                  # List recent codes + create form
  actions.ts                # createCodeAction, deactivateCodeAction
                            # (server actions, called by <form action={…}>)
```

`page.tsx`:
- Server component. Calls `listRecentCodes(50)` and
  `listRecentSales({ limit: 20, windowDays: 30 })` in parallel
  server-side.
- Renders three sections:
  - **Create code form** — percent (number input, 1–100), prefix
    (text input, optional, e.g. `GIFT-`), expiry (date input, defaults
    to today + 30 days, can be cleared for "no expiry"), note (text
    input, required, 80 char max). Submit posts to `createCodeAction`.
  - **Recent codes table** — code (monospace + click-to-copy),
    percent, redeemed badge, expires, note, created (relative +
    email), share URL (click-to-copy), [deactivate] button.
  - **Recent sales** — KPI strip at the top: count + gross + net of
    discounts in the last 30 days. Below it, a table of the last 20
    succeeded prototype PaymentIntents: amount, discount applied (if
    any), buyer email, timestamp.
- A toast/banner at the top of the page shows the most recently
  created code prominently — easy to copy, big share URL, hint
  "share this once; it's single-use."

`actions.ts`:
- `createCodeAction(formData)`:
  - Reads session cookie via the auth lib from the magic-link plan, gets `createdByEmail`.
  - Validates form fields:
    - `percent`: integer 1–100.
    - `note`: non-empty after trim, ≤ 80 chars.
    - `prefix`: optional; if present, [A-Z0-9-]+, ≤ 16 chars (Stripe rejects mixed-case codes? — actually Stripe accepts them and is case-insensitive on lookup. Normalize to uppercase regardless.)
    - `expiresAt`: optional; if present, must be in the future and ≤ 1 year out.
  - Calls `createSingleUseCode`.
  - `revalidatePath('/admin')`.
  - Returns the new code so `page.tsx` can highlight it.
- `deactivateCodeAction(promoId)`:
  - Same auth lookup.
  - Calls `deactivateCode`.
  - `revalidatePath('/admin')`.

Both actions are protected by the existing middleware gate from the
magic-link plan — anyone hitting them without a valid session
redirects to `/admin/login`. Server actions in protected routes
inherit that automatically because the middleware runs on every
request.

### Env additions

None. Trust the admin, no soft cap. (Reverse this with a one-line
`ADMIN_DISCOUNT_MAX_PERCENT` env if we observe issues.)

No new third-party secrets.

### Files touched

```
src/
  app/
    admin/
      page.tsx                          new   list + create form + sales panel
      actions.ts                        new   server actions
  lib/
    admin-codes.ts                      new   Stripe wrapper helpers (create/list/deactivate)
    admin-sales.ts                      new   Stripe sales lookup + KPI aggregation
README.md                               modify  document the new flow + decommission steps
scripts/
  decommission-recurring-codes.mjs      new   one-shot deactivator for PROTO5/10/15/20/25
  seed-discounts.mjs                    modify  drop the recurring-code seeding block; keep the prototype Product creation logic only
docs/
  plans/2026-05-06-admin-discount-codes.md   new   this doc
```

### Validation invariants

- Percent is integer in [1, 100]. No app-level cap (Stripe doesn't
  cap either; we trust the admin).
- Note is non-empty after trim, ≤ 80 characters.
- Prefix, if provided, is `^[A-Z0-9-]{1,16}$` after uppercasing.
- Expiry, if provided, is in the future and ≤ 1 year away. (Sanity
  cap; admin won't realistically issue 5-year codes.)
- `createdByEmail` always pulled from the session cookie, never the
  form. Form fields can't be used to spoof who issued the code.
- Listed codes always filter by `metadata.kind === 'single-use'` so
  the admin UI never shows the recurring `PROTO*` codes (those have
  `kind` unset). Decommission script flips `kind` on PROTO* if we
  want them visible for audit purposes — out of scope.
- Sales lookup uses the same `metadata.sku === 'viso-prototype'`
  filter the inventory counter does. Refunded PaymentIntents are
  shown with a "refunded" badge but still count in the gross — net
  is the operational number.

### Decommissioning the recurring codes

`scripts/decommission-recurring-codes.mjs`:
1. List all promo codes with `code IN ('PROTO5', 'PROTO10', 'PROTO15', 'PROTO20', 'PROTO25')`.
2. For each, `stripe.promotionCodes.update(id, { active: false })`.
3. Log what was deactivated.
4. Idempotent: if already inactive, no-op.

Run order:
1. Run against test Stripe (staging account): `STRIPE_SECRET_KEY=sk_test_… node scripts/decommission-recurring-codes.mjs`.
2. Run against live Stripe (prod account): `STRIPE_SECRET_KEY=sk_live_… …`.
3. After running, the public homepage's `/?code=PROTO10` invalid-banner
   path will fire for any old shared link — exactly the message we
   want. The new admin-generated codes are unrelated and unaffected.

`scripts/seed-discounts.mjs` keeps its prototype-product creation
logic but the recurring-codes block can be deleted in this PR — that
script becomes "create the prototype product if missing, capture
STRIPE_PROTOTYPE_PRODUCT_ID." Or we keep it as-is and just don't
re-run the codes block. Recommend the trim — less to maintain.

## Rollout

Strict ordering — magic-link auth must land first.

0. **Prereq:** `aelix-zwk` (admin magic-link auth) deployed to prod.
1. Branch `feat/admin-discount-codes` off `staging`.
2. Implement, typecheck, lint.
3. Verify locally on Node 22:
   - Sign in to `/admin` with the magic-link flow.
   - Create a code with percent=10, note="local smoke test".
   - Confirm it shows up in the list.
   - Open a fresh browser, visit `http://localhost:3001/?code=<the code>`,
     confirm green banner with "10% off".
   - Click [buy prototype], confirm the Stripe Checkout session shows the discount.
   - Refresh `/admin`, confirm "redeemed" badge updates within ~60s
     (cache TTL on the inventory module is shared with discount lookup).
   - Try percent=999 → form rejects with "must be 1–50".
   - Click [deactivate] on a code → confirm it disappears from the
     active list and `/?code=<that code>` now shows the invalid banner.
4. PR `feat/admin-discount-codes` → `staging`. Set staging
   `ADMIN_DISCOUNT_MAX_PERCENT` if non-default. Merge → staging deploys.
5. Smoke staging end-to-end. Run the decommission script against the
   test Stripe account. Confirm `PROTO10` etc. now show as invalid on
   `stg.obscuruslabs.com/?code=PROTO10`.
6. **Stop and ask the user before promoting to prod.**
7. PR `staging → main`. After merge + deploy, run the decommission
   script against the live Stripe account.
8. Smoke prod identically.

## Out of scope (followups)

- **Sales reconciliation panel** on `/admin`. If the user picks "yes"
  on decision #6, fold into this PR; otherwise plan separately.
- **Per-customer cap** (Stripe `restrictions.first_time_transaction`
  is subscription-only; for one-shots we'd need a customer record).
  Not needed for single-use.
- **Code reactivation.** Stripe disallows. If we deactivate by mistake,
  generate a new one. Document.
- **Bulk generation.** Generate N codes at once for a campaign.
  Trivial extension once the single-create flow lands.
- **Audit log of admin actions** (who created which code, who
  deactivated). The Stripe metadata already carries `created_by`; a
  proper audit log is a separate concern.
- **CSV export** of the codes list. Easy add when we want it.
- **Coupon-per-percent optimization** (one coupon per common percent,
  many promo codes against it) instead of one coupon per code. Worth
  doing if Stripe records balloon past low-thousands.

## Risks

- **Race on the last redemption.** Stripe enforces `max_redemptions:
  1` server-side, so two simultaneous buyers can't both succeed —
  Stripe returns an error to the loser. Acceptable; surface the
  generic "checkout failed" message on our side.
- **Code in URL — same as today.** Magic-link tokens and discount
  codes both ride in URLs. Single-use makes leaks far less harmful:
  even a publicly-posted code dies after the first click. Worst case
  is a "first responder" wins instead of the intended recipient —
  scope of damage is bounded to one prototype.
- **Stripe rate limits.** `promotionCodes.list` for the admin home
  hits Stripe on every page load. The list is small (we cap at 50),
  but consider adding the same 60s cache pattern from
  `lib/inventory.ts`. Easy if we observe a problem; not pre-optimizing.
- **`metadata.kind` filter assumes consistent tagging.** If someone
  creates a single-use code via the Stripe Dashboard without setting
  `kind: 'single-use'`, it won't show in the admin UI. Acceptable —
  dashboard-created codes are out-of-band by definition. Worth a
  README note.
- **Decommission is not reversible** (Stripe deactivation is
  permanent for the promo code; the underlying coupon stays). If we
  decommission PROTO* and immediately need them back, we'd recreate
  with `seed-discounts.mjs` against a NEW set of coupon IDs. Customers
  who'd already used the old codes on completed checkouts are
  unaffected.
- **Empty `STRIPE_PROTOTYPE_PRODUCT_ID`** — `createSingleUseCode`
  must hard-fail (clear error to the admin) if this env var isn't
  set. A code without a product restriction would apply to anything,
  including the future $249 Ghost — bad. Validate at creation time.
