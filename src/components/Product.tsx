import { PRODUCT, formatPrice } from '@/lib/product';
import BuyButton from './BuyButton';

export default function Product() {
  return (
    <section id="product" className="relative z-30 px-6 py-24 md:py-32 border-t border-neutral-900">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-8 mb-14 flex-wrap">
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-widest mb-3">the product</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none">
              viso <span className="text-neutral-500">.01 &apos;ghost&apos;</span>
            </h2>
          </div>
          <p className="text-lg text-neutral-400 max-w-md">{PRODUCT.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-900 border border-neutral-900 rounded-xl overflow-hidden">
          {PRODUCT.specs.map((s) => (
            <div key={s.label} className="bg-[#0A0A0A] p-6 flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-neutral-500">{s.label}</div>
              <div className="text-base text-neutral-100">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-sm text-neutral-500">one model. one price.</div>
            <div className="text-4xl font-bold tracking-tight">
              {formatPrice(PRODUCT.priceCents)}
              <span className="text-neutral-500 text-lg font-normal ml-3">free U.S. shipping</span>
            </div>
          </div>
          <BuyButton />
        </div>
      </div>
    </section>
  );
}
