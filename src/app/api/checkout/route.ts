import { NextResponse, type NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRODUCTS, isSku, type Sku } from '@/lib/product';
import { SITE_URL, STRIPE_PROTOTYPE_PRODUCT_ID } from '@/lib/env';
import { getPrototypeInventory } from '@/lib/inventory';
import { lookupPromoCode, discountAppliesTo, normalizeCode } from '@/lib/discount';

// SKU-aware Checkout. Body: { sku?, code? } — both optional. Default
// 'viso-ghost' for back-compat with the existing <BuyButton /> on the full
// storefront, which posts with no body. Prices and shipping rates come from
// the server catalog — the client never sends amounts.
export async function POST(req: NextRequest) {
  let sku: Sku = 'viso-ghost';
  let rawCode: string | undefined;
  try {
    const text = await req.text();
    if (text.trim().length > 0) {
      const body = JSON.parse(text) as { sku?: unknown; code?: unknown };
      if (body.sku !== undefined) {
        if (!isSku(body.sku)) {
          return NextResponse.json({ error: 'invalid sku' }, { status: 400 });
        }
        sku = body.sku;
      }
      if (typeof body.code === 'string' && body.code.trim().length > 0) {
        rawCode = body.code;
      }
    }
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (sku === 'viso-prototype') {
    const inv = await getPrototypeInventory();
    if (!inv.available) {
      return NextResponse.json(
        { error: 'sold out', code: 'sold_out' },
        { status: 410 },
      );
    }
  }

  const product = PRODUCTS[sku];
  const stableProductId =
    sku === 'viso-prototype' ? STRIPE_PROTOTYPE_PRODUCT_ID || undefined : undefined;

  // Resolve discount: only attach if SKU is prototype (defense-in-depth
  // alongside the coupon's own applies_to.products restriction). Invalid
  // codes silently fall back to full price — the page-level flow surfaces
  // the "invalid or expired" feedback to the user before they get here.
  type SessionParams = NonNullable<Parameters<typeof stripe.checkout.sessions.create>[0]>;
  type Discount = NonNullable<SessionParams['discounts']>[number];
  type LineItem = NonNullable<SessionParams['line_items']>[number];

  let discounts: Discount[] | undefined;
  if (rawCode && sku === 'viso-prototype') {
    const info = await lookupPromoCode(rawCode);
    if (info && discountAppliesTo(info, stableProductId)) {
      discounts = [{ promotion_code: info.promotionCodeId }];
    } else {
      console.warn('[checkout] promo code dropped', {
        code: normalizeCode(rawCode),
        reason: info ? 'product-mismatch' : 'invalid-or-expired',
      });
    }
  }

  try {
    const lineItem: LineItem = {
      quantity: 1,
      price_data: {
        currency: product.currency,
        unit_amount: product.priceCents,
        // Prefer the stable product reference when available so coupons
        // with applies_to.products can match. Fall back to inline
        // product_data when the operator hasn't run the seed script yet.
        ...(stableProductId
          ? { product: stableProductId }
          : {
              product_data: {
                name: `${product.name} '${product.codename}'`,
                description: product.tagline,
                metadata: { sku: product.id },
              },
            }),
      },
    };

    const params: SessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [lineItem],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'AU', 'JP'],
      },
      automatic_tax: { enabled: true },
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      metadata: { sku: product.id },
      payment_intent_data: { metadata: { sku: product.id } },
      // Stripe disallows discounts + allow_promotion_codes on the same
      // session. If we auto-applied a code, the customer can't type a
      // different one. Otherwise, expose the entry field on Stripe's page.
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
    };

    if (product.shipping.kind === 'paid') {
      params.shipping_options = product.shipping.rates.map((rate) => ({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: rate.amountCents, currency: product.currency },
          display_name: rate.label,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: rate.minDays },
            maximum: { unit: 'business_day', value: rate.maxDays },
          },
        },
      }));
    }

    const session = await stripe.checkout.sessions.create(params);
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[checkout] failed', { sku, err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
