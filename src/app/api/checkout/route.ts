import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRODUCT } from '@/lib/product';
import { SITE_URL } from '@/lib/env';

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PRODUCT.currency,
            unit_amount: PRODUCT.priceCents,
            product_data: {
              name: `${PRODUCT.name} '${PRODUCT.codename}'`,
              description: PRODUCT.tagline,
              metadata: { sku: PRODUCT.id },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'AU', 'JP'],
      },
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      metadata: { sku: PRODUCT.id },
    });

    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[checkout] failed', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
