import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import { orderConfirmationEmail, orderEmailSubject } from '@/lib/emails/order-confirmation';
import { isSku } from '@/lib/product';
import { invalidatePrototypeInventory } from '@/lib/inventory';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    console.error('[stripe webhook] verify failed', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email ?? session.customer_email;
      const name = session.customer_details?.name ?? undefined;
      const amount = session.amount_total ?? 0;
      const rawSku = session.metadata?.sku;
      const sku = isSku(rawSku) ? rawSku : undefined;

      console.log('[stripe webhook] order completed', {
        id: session.id,
        sku,
        email,
        amount,
      });

      // Bust the prototype inventory cache so the next render reflects the
      // sale even if Stripe Search hasn't caught up yet.
      if (sku === 'viso-prototype') {
        invalidatePrototypeInventory();
      }

      if (email) {
        const { html, text } = orderConfirmationEmail({
          orderId: session.id,
          amountCents: amount,
          customerName: name ?? undefined,
          sku,
        });
        await sendEmail({
          to: email,
          subject: orderEmailSubject(sku),
          html,
          text,
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler failed', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }
}
