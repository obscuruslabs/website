#!/usr/bin/env node
// Idempotent bootstrap for prototype discount codes.
//
// 1. Ensures a stable Stripe Product exists for the prototype SKU. The
//    /api/checkout route uses this product's ID (via STRIPE_PROTOTYPE_PRODUCT_ID)
//    when constructing line items so coupons with applies_to.products can match.
//
// 2. Creates five percent-off coupons (5/10/15/20/25%) restricted to that
//    product, with matching promotion codes (PROTO5..PROTO25 by default).
//
// Re-running is safe: existing products/coupons/codes are detected and reused.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_... node scripts/seed-discounts.mjs
//   STRIPE_SECRET_KEY=sk_live_... node scripts/seed-discounts.mjs
//
// Environment overrides:
//   PROTOTYPE_PRODUCT_NAME       default: "VISO Prototype"
//   PROTOTYPE_PRODUCT_LOOKUP_KEY default: "viso-prototype" (used for idempotency)
//
// Per-tier overrides via DISCOUNT_TIERS (JSON, optional). Default:
//   [
//     { "percent": 5,  "code": "PROTO5",  "max": null },
//     { "percent": 10, "code": "PROTO10", "max": null },
//     { "percent": 15, "code": "PROTO15", "max": null },
//     { "percent": 20, "code": "PROTO20", "max": 10   },
//     { "percent": 25, "code": "PROTO25", "max": 10   }
//   ]

import Stripe from 'stripe';

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error('STRIPE_SECRET_KEY not set. Aborting.');
  process.exit(2);
}
const MODE = KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST';

const PRODUCT_NAME = process.env.PROTOTYPE_PRODUCT_NAME ?? 'VISO Prototype';
const PRODUCT_LOOKUP_KEY = process.env.PROTOTYPE_PRODUCT_LOOKUP_KEY ?? 'viso-prototype';

const DEFAULT_TIERS = [
  { percent: 5,  code: 'PROTO5',  max: null },
  { percent: 10, code: 'PROTO10', max: null },
  { percent: 15, code: 'PROTO15', max: null },
  { percent: 20, code: 'PROTO20', max: 10 },
  { percent: 25, code: 'PROTO25', max: 10 },
];
const TIERS = process.env.DISCOUNT_TIERS
  ? JSON.parse(process.env.DISCOUNT_TIERS)
  : DEFAULT_TIERS;

const stripe = new Stripe(KEY, { apiVersion: '2026-03-25.dahlia' });

console.log(`\nMode: ${MODE}`);
console.log(`Product name: ${PRODUCT_NAME}`);
console.log(`Product lookup key: ${PRODUCT_LOOKUP_KEY}`);
console.log(`Tiers: ${TIERS.map((t) => `${t.percent}%→${t.code}`).join(', ')}\n`);

async function ensureProduct() {
  // Stripe products support `metadata.lookup_key`-style filtering only
  // through search (live mode + indexed search). Easiest portable: list
  // active products, find by metadata.sku.
  const list = await stripe.products.list({ limit: 100, active: true });
  const existing = list.data.find(
    (p) => p.metadata?.sku === PRODUCT_LOOKUP_KEY || p.name === PRODUCT_NAME,
  );
  if (existing) {
    console.log(`✓ Product exists: ${existing.id} (${existing.name})`);
    return existing;
  }
  const created = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Hand-built pre-production unit. Numbered, limited.',
    metadata: { sku: PRODUCT_LOOKUP_KEY },
  });
  console.log(`+ Product created: ${created.id} (${created.name})`);
  return created;
}

async function ensureCoupon({ percent, productId }) {
  const name = `Prototype ${percent}% off`;
  // Coupons aren't directly searchable, so list and filter.
  let starting_after;
  for (let i = 0; i < 50; i++) {
    const page = await stripe.coupons.list({
      limit: 100,
      starting_after,
      expand: ['data.applies_to'],
    });
    const match = page.data.find(
      (c) =>
        c.name === name &&
        c.percent_off === percent &&
        c.applies_to?.products?.includes(productId),
    );
    if (match) {
      console.log(`✓ Coupon exists: ${match.id} (${name})`);
      return match;
    }
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1]?.id;
  }
  const created = await stripe.coupons.create({
    name,
    percent_off: percent,
    duration: 'once',
    applies_to: { products: [productId] },
  });
  console.log(`+ Coupon created: ${created.id} (${name})`);
  return created;
}

async function ensurePromoCode({ couponId, code, max }) {
  const list = await stripe.promotionCodes.list({
    code,
    limit: 1,
    expand: ['data.promotion.coupon'],
  });
  const existing = list.data[0];
  if (existing) {
    const existingCoupon = existing.promotion?.coupon;
    const existingCouponId =
      typeof existingCoupon === 'string' ? existingCoupon : existingCoupon?.id;
    if (existingCouponId !== couponId) {
      console.error(
        `✗ Code "${code}" exists but points to coupon ${existingCouponId}, expected ${couponId}.`,
      );
      console.error(
        '  Refusing to clobber. Either delete it in Stripe Dashboard or pick a different code.',
      );
      process.exitCode = 1;
      return null;
    }
    console.log(`✓ Promo code exists: ${existing.id} (${code})`);
    return existing;
  }
  const params = { promotion: { type: 'coupon', coupon: couponId }, code };
  if (max != null) params.max_redemptions = max;
  const created = await stripe.promotionCodes.create(params);
  console.log(
    `+ Promo code created: ${created.id} (${code}${max != null ? `, max ${max}` : ''})`,
  );
  return created;
}

async function main() {
  const product = await ensureProduct();
  console.log();
  for (const tier of TIERS) {
    const coupon = await ensureCoupon({ percent: tier.percent, productId: product.id });
    await ensurePromoCode({ couponId: coupon.id, code: tier.code, max: tier.max });
  }
  console.log();
  console.log('=========================================================');
  console.log(`Stripe ${MODE} mode: prototype product + ${TIERS.length} codes ready.`);
  console.log();
  console.log('Next step — set the product ID as a Fly secret:');
  console.log();
  if (MODE === 'TEST') {
    console.log(
      `  flyctl secrets set -a obscuruslabs-staging STRIPE_PROTOTYPE_PRODUCT_ID=${product.id}`,
    );
  } else {
    console.log(
      `  flyctl secrets set -a obscuruslabs STRIPE_PROTOTYPE_PRODUCT_ID=${product.id}`,
    );
  }
  console.log();
  console.log('Codes ready to share:');
  for (const tier of TIERS) {
    console.log(`  ${tier.code.padEnd(12)}  ${tier.percent}% off`);
  }
  console.log('=========================================================\n');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
