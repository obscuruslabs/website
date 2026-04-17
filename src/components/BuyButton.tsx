'use client';
import { useState, useTransition } from 'react';

type Props = { label?: string; className?: string };

export default function BuyButton({
  label = '[ buy now — $249 ]',
  className = 'bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-600 hover:text-white transition-all shadow-2xl cursor-pointer disabled:opacity-60 disabled:cursor-wait',
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/checkout', { method: 'POST' });
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
      <button onClick={onClick} disabled={isPending} className={className}>
        {isPending ? '[ redirecting… ]' : label}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
