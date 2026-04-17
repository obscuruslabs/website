import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY not set — checkout will fail.');
}

export const stripe = new Stripe(key ?? 'sk_test_placeholder', {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
