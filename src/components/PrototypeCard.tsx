import Image from 'next/image';
import { cookies } from 'next/headers';
import { PRODUCTS, formatPrice, formatPriceExact } from '@/lib/product';
import { getPrototypeInventory } from '@/lib/inventory';
import { lookupPromoCode } from '@/lib/discount';
import BuyButton from './BuyButton';

const ANGLES = [
  { src: '/prototypes/prototype-3.jpg', alt: 'VISO prototype, front view' },
  { src: '/prototypes/prototype-2.jpg', alt: 'VISO prototype, rear view showing OBSCURUS branding' },
  { src: '/prototypes/prototype-1.jpg', alt: 'VISO prototype, side view showing OBSCURUS branding' },
];

export default async function PrototypeCard() {
  const product = PRODUCTS['viso-prototype'];
  const inventory = await getPrototypeInventory();
  const usRate = product.shipping.kind === 'paid'
    ? product.shipping.rates.find((r) => r.country === 'US')
    : undefined;

  // Read discount cookie server-side and re-validate (lookup is cached
  // for 60s). The cookie may carry a code that's since been deactivated;
  // a stale lookup would just mean the auto-apply doesn't fire.
  const cookieStore = await cookies();
  const cookieCode = cookieStore.get('discount_code')?.value;
  const discount = cookieCode ? await lookupPromoCode(cookieCode) : null;

  return (
    <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950/50 flex flex-col">
      <div className="relative aspect-[4/3] bg-black">
        <Image
          src={ANGLES[0].src}
          alt={ANGLES[0].alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
          className="object-cover"
        />
      </div>

      <div className="grid grid-cols-3 gap-px bg-neutral-900">
        {ANGLES.slice(1).concat(ANGLES[0]).map((a) => (
          <div key={a.src} className="relative aspect-[4/3] bg-black">
            <Image
              src={a.src}
              alt={a.alt}
              fill
              sizes="(min-width: 768px) 16vw, 33vw"
              className="object-cover opacity-80"
            />
          </div>
        ))}
      </div>

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-xs text-neutral-500 uppercase tracking-widest">
            buy a prototype
          </p>
          <p className="text-xs text-neutral-500">
            {inventory.soldOut
              ? 'sold out'
              : `${inventory.remaining} of ${inventory.limit} remaining`}
          </p>
        </div>

        <h3 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
          Hand-built. <span className="text-neutral-500">Numbered.</span>
        </h3>

        <p className="text-neutral-400 text-sm leading-relaxed">
          Real prototypes from our lab. Full IR emitter array, rough edges, fully
          functional. Ship within 5 business days.
        </p>

        <div className="flex items-end justify-between gap-4 mt-auto pt-2 flex-wrap">
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {formatPrice(product.priceCents)}
            </div>
            <div className="text-xs text-neutral-500">
              {usRate
                ? `+ ${formatPriceExact(usRate.amountCents)} U.S. shipping`
                : '+ shipping at checkout'}
            </div>
          </div>
          <BuyButton
            sku="viso-prototype"
            code={discount?.code}
            disabled={!inventory.available}
            label={
              discount
                ? `[ buy prototype — ${formatPrice(product.priceCents)} (${discount.percentOff}% off) ]`
                : `[ buy prototype — ${formatPrice(product.priceCents)} ]`
            }
            className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-purple-600 hover:text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {!inventory.available && (
          <p className="text-xs text-neutral-500">
            All prototypes are spoken for. Join the waitlist for VISO .01.
          </p>
        )}
      </div>
    </div>
  );
}
