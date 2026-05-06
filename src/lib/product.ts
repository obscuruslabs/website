// Single source of truth for the product catalog. The client never sends
// prices or shipping costs — the API route reads them from here when
// building a Stripe Checkout session.

export type Sku = 'viso-ghost' | 'viso-prototype';

type FreeShipping = { kind: 'free' };
type ShippingRate = { country: 'US' | 'INTL'; amountCents: number; label: string; minDays: number; maxDays: number };
type PaidShipping = { kind: 'paid'; rates: readonly ShippingRate[] };

export type ProductDef = {
  id: Sku;
  name: string;
  codename: string;
  priceCents: number;
  currency: 'usd';
  tagline: string;
  description: string;
  shipping: FreeShipping | PaidShipping;
  specs: ReadonlyArray<{ label: string; value: string }>;
  // Optional stable Stripe Product ID — when set, the checkout line item
  // references this instead of creating an inline product_data, which is
  // what coupons with applies_to.products need to match against.
  stripeProductId?: string;
};

export const PRODUCTS = {
  'viso-ghost': {
    id: 'viso-ghost',
    name: 'VISO .01',
    codename: 'Ghost',
    priceCents: 24900,
    currency: 'usd',
    tagline: 'Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.',
    description:
      'A pair of IR-emitting frames that flood nearby CMOS sensors with 850nm and 940nm light while remaining invisible to the human eye. Walk into any camera. Walk out a smudge.',
    shipping: { kind: 'free' },
    specs: [
      { label: 'Runtime', value: '4 hours continuous' },
      { label: 'Charge', value: 'USB-C, 45 min to full' },
      { label: 'Emitters', value: '12× dual-band IR (850nm + 940nm)' },
      { label: 'Frame', value: 'Grade 5 titanium, matte PVD coating' },
      { label: 'Weight', value: '42 g' },
      { label: 'Lens', value: 'Polycarbonate, Rx-ready' },
      { label: 'Ingress', value: 'IPX4 (rain, sweat)' },
      { label: 'Indicator', value: 'None. Discretion is the point.' },
    ],
  },
  'viso-prototype': {
    id: 'viso-prototype',
    name: 'VISO Prototype',
    codename: 'Pre-Ghost',
    priceCents: 3900,
    currency: 'usd',
    tagline: 'A working prototype from the bench. Hand-built, full IR emitter array. Numbered, limited.',
    description:
      'These are real prototypes from our lab — the units we use to dial in the optics and emitter geometry on the way to VISO .01. Hand-assembled, rough edges, fully functional. Numbered, limited run.',
    shipping: {
      kind: 'paid',
      rates: [
        { country: 'US', amountCents: 799, label: 'USPS Priority — 3-5 business days', minDays: 3, maxDays: 5 },
        { country: 'INTL', amountCents: 1999, label: 'International — 7-14 business days', minDays: 7, maxDays: 14 },
      ],
    },
    specs: [
      { label: 'Status', value: 'Pre-production prototype' },
      { label: 'Build', value: 'Hand-assembled in Portland, OR' },
      { label: 'Emitters', value: 'Full dual-band IR array (850/940nm)' },
      { label: 'Frame', value: 'Polycarbonate, prototype hardware' },
      { label: 'Edition', value: 'Numbered, limited' },
    ],
  },
} as const satisfies Record<Sku, ProductDef>;

// Back-compat alias. Existing components (Hero, Product, ProductJsonLd, etc.)
// import PRODUCT and continue to render the Ghost as before.
export const PRODUCT = PRODUCTS['viso-ghost'];

export function isSku(value: unknown): value is Sku {
  return value === 'viso-ghost' || value === 'viso-prototype';
}

export function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Formats with cents shown when the amount has them (e.g. $7.99 instead of
// $8). Used for shipping rates and other sub-dollar-precision values.
export function formatPriceExact(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
