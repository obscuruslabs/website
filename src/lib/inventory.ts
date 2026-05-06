// Prototype inventory counter. We don't have a database; Stripe is the
// source of truth for sales. We count completed Checkout sessions whose
// metadata carries the prototype SKU and compare against PROTOTYPE_LIMIT.
//
// Stripe Search has ~1 minute eventual consistency. The webhook invalidates
// our 60-second in-memory cache when a sale lands so observed sales reflect
// almost immediately; manual or out-of-band sales catch up on the next tick.

import { stripe } from '@/lib/stripe';
import { PROTOTYPE_LIMIT, PROTOTYPE_AVAILABLE } from '@/lib/env';

const PROTOTYPE_SKU = 'viso-prototype';
const CACHE_TTL_MS = 60_000;
// Detects whether a real Stripe secret is configured. The fallback in
// lib/stripe.ts uses 'sk_test_placeholder' when the env var is missing —
// hitting Stripe with that key yields a 401, and in dev we'd rather show
// "available" than the fail-closed sold-out state.
const STRIPE_CONFIGURED =
  !!process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder';

type Snapshot = {
  sold: number;
  limit: number;
  remaining: number;
  soldOut: boolean;
  available: boolean;
};

let cache: { value: number; expiresAt: number } | null = null;

export function invalidatePrototypeInventory() {
  cache = null;
}

async function countSoldFromStripe(): Promise<number> {
  // Stripe Search filters by metadata + status server-side. The Search API
  // is available on PaymentIntents (not on Checkout Sessions in this SDK),
  // so we count *succeeded* prototype payment intents — equivalent for our
  // purposes since each Checkout session in `payment` mode yields one PI.
  let total = 0;
  let page: string | undefined = undefined;
  // Defensive cap so a misconfiguration can never spin forever.
  for (let i = 0; i < 50; i++) {
    const res = await stripe.paymentIntents.search({
      query: `metadata['sku']:'${PROTOTYPE_SKU}' AND status:'succeeded'`,
      limit: 100,
      page,
    });
    total += res.data.length;
    if (!res.has_more || !res.next_page) break;
    page = res.next_page;
  }
  return total;
}

export async function getPrototypeInventory(): Promise<Snapshot> {
  const now = Date.now();
  let sold: number;
  if (cache && cache.expiresAt > now) {
    sold = cache.value;
  } else if (!STRIPE_CONFIGURED) {
    // Local development without a real Stripe key. Treat as 0 sold so the
    // available state renders. Production deploys always have the secret
    // set, so this branch never runs there.
    sold = 0;
  } else {
    try {
      sold = await countSoldFromStripe();
      cache = { value: sold, expiresAt: now + CACHE_TTL_MS };
    } catch (err) {
      console.error('[inventory] stripe search failed', err);
      // Fail closed on the buy side: pretend the run is full so we don't
      // accidentally overshoot. The kill switch / limit env still apply.
      sold = PROTOTYPE_LIMIT;
    }
  }
  const remaining = Math.max(0, PROTOTYPE_LIMIT - sold);
  const soldOut = remaining <= 0;
  return {
    sold,
    limit: PROTOTYPE_LIMIT,
    remaining,
    soldOut,
    available: PROTOTYPE_AVAILABLE && !soldOut,
  };
}
