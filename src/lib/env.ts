export type SiteMode = 'coming_soon' | 'full';

export const SITE_MODE: SiteMode =
  process.env.SITE_MODE === 'full' ? 'full' : 'coming_soon';

export const NOINDEX = process.env.NOINDEX === 'true';

export const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? '';
export const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? '';
export const BASIC_AUTH_ENABLED = Boolean(
  BASIC_AUTH_USER && BASIC_AUTH_PASSWORD,
);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://obscuruslabs.com';

// Prototype sales: a hard cap on how many prototype units we offer in this
// run, plus a kill switch that wins over the counter. Both are read at
// request time so a Fly secret flip takes effect without redeploying.
export const PROTOTYPE_LIMIT = (() => {
  const raw = process.env.PROTOTYPE_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 12;
})();

// Default true — set to literal 'false' to pause prototype sales without
// changing the limit (e.g., shipping issues). Treated as "available unless
// explicitly disabled".
export const PROTOTYPE_AVAILABLE = process.env.PROTOTYPE_AVAILABLE !== 'false';

// Stable Stripe Product ID for the prototype. Required for the
// `applies_to.products` restriction on prototype-only coupons. Created
// via scripts/seed-discounts.mjs and persisted as a Fly secret. When
// unset, /api/checkout falls back to inline product_data — coupons with
// product restrictions won't apply, but the buy still works at full
// price.
export const STRIPE_PROTOTYPE_PRODUCT_ID = process.env.STRIPE_PROTOTYPE_PRODUCT_ID ?? '';
