import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import { orderConfirmationEmail } from '@/lib/emails/order-confirmation';

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

      console.log('[stripe webhook] order completed', {
        id: session.id,
        email,
        amount,
      });

      if (email) {
        const { html, text } = orderConfirmationEmail({
          orderId: session.id,
          amountCents: amount,
          customerName: name ?? undefined,
        });
        await sendEmail({
          to: email,
          subject: 'your VISO .01 is on the way',
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
