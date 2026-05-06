// Promo-code lookup against Stripe with a 60-second per-code in-memory
// cache. Stripe is the source of truth — we never trust client-supplied
// discount info. The cache keeps homepage renders cheap when the same
// code is shared widely.

import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

const CACHE_TTL_MS = 60_000;

const STRIPE_CONFIGURED =
  !!process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder';

export type DiscountInfo = {
  code: string;
  promotionCodeId: string;
  percentOff: number;
  appliesToProductIds: string[] | null;
};

type CacheEntry = { value: DiscountInfo | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function invalidateDiscountCache(code?: string) {
  if (code) cache.delete(normalizeCode(code));
  else cache.clear();
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function lookupPromoCode(rawCode: string): Promise<DiscountInfo | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const now = Date.now();
  const cached = cache.get(code);
  if (cached && cached.expiresAt > now) return cached.value;

  if (!STRIPE_CONFIGURED) {
    cache.set(code, { value: null, expiresAt: now + CACHE_TTL_MS });
    return null;
  }

  let result: DiscountInfo | null = null;
  try {
    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon', 'data.promotion.coupon.applies_to'],
    });
    const pc: Stripe.PromotionCode | undefined = list.data[0];
    const coupon = pc?.promotion?.coupon;
    if (
      pc &&
      coupon &&
      typeof coupon !== 'string' &&
      coupon.percent_off != null
    ) {
      result = {
        code: pc.code,
        promotionCodeId: pc.id,
        percentOff: coupon.percent_off,
        appliesToProductIds: coupon.applies_to?.products ?? null,
      };
    }
  } catch (err) {
    console.error('[discount] stripe lookup failed', { code, err });
    // Fall through to caching null — failing closed on the discount side
    // means the buy still works at full price.
  }

  cache.set(code, { value: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

// Returns the discount only if it can apply to the given product ID.
// `appliesToProductIds === null` means the coupon is unrestricted.
export function discountAppliesTo(info: DiscountInfo, productId: string | undefined): boolean {
  if (!info.appliesToProductIds) return true;
  if (!productId) return false;
  return info.appliesToProductIds.includes(productId);
}
