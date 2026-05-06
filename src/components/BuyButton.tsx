'use client';
import { useState, useTransition } from 'react';
import { PRODUCTS, formatPrice, type Sku } from '@/lib/product';

type Props = {
  sku?: Sku;
  code?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  disabledLabel?: string;
};

const DEFAULT_CLASS =
  'bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-600 hover:text-white transition-all shadow-2xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

export default function BuyButton({
  sku = 'viso-ghost',
  code,
  label,
  className = DEFAULT_CLASS,
  disabled = false,
  disabledLabel = '[ sold out ]',
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const product = PRODUCTS[sku];
  const defaultLabel = `[ buy now — ${formatPrice(product.priceCents)} ]`;
  const visibleLabel = label ?? defaultLabel;

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(code ? { sku, code } : { sku }),
        });
        if (res.status === 410) {
          setError('sold out — try the waitlist');
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? 'checkout failed');
        }
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'checkout failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={onClick} disabled={isPending || disabled} className={className}>
        {disabled ? disabledLabel : isPending ? '[ redirecting… ]' : visibleLabel}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
