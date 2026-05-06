import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { PRODUCTS, isSku, type Sku } from '@/lib/product';
import { SITE_URL } from '@/lib/env';
import { getPrototypeInventory } from '@/lib/inventory';

// SKU-aware Checkout. Body: { sku?: 'viso-ghost' | 'viso-prototype' }.
// Default 'viso-ghost' for back-compat with the existing <BuyButton /> on
// the full storefront, which posts with no body. Prices and shipping rates
// come from the server catalog — the client never sends amounts.
export async function POST(req: NextRequest) {
  let sku: Sku = 'viso-ghost';
  try {
    // Body is optional; old callers send none.
    const text = await req.text();
    if (text.trim().length > 0) {
      const body = JSON.parse(text) as { sku?: unknown };
      if (body.sku !== undefined) {
        if (!isSku(body.sku)) {
          return NextResponse.json({ error: 'invalid sku' }, { status: 400 });
        }
        sku = body.sku;
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

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.priceCents,
            product_data: {
              name: `${product.name} '${product.codename}'`,
              description: product.tagline,
              metadata: { sku: product.id },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'AU', 'JP'],
      },
      automatic_tax: { enabled: true },
      // Prototype isn't on sale; promo codes only on the full Ghost.
      allow_promotion_codes: sku === 'viso-ghost',
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      metadata: { sku: product.id },
      // Propagate SKU onto the PaymentIntent so inventory.ts can count
      // succeeded prototype PIs via the Search API (Search isn't available
      // on Checkout sessions in this SDK).
      payment_intent_data: { metadata: { sku: product.id } },
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
