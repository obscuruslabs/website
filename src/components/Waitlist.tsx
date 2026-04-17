'use client';
import { useState } from 'react';

type Props = { compact?: boolean };

export default function Waitlist({ compact = false }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'could not subscribe');
      setStatus('ok');
      setMessage("you're on the list. check your inbox.");
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'could not subscribe');
    }
  }

  const form = (
    <>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
        <input
          type="email"
          required
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-base placeholder:text-neutral-600 focus:outline-none focus:border-purple-600"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-purple-600 hover:text-white transition-colors disabled:opacity-60"
        >
          {status === 'loading' ? 'subscribing…' : 'join waitlist'}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </>
  );

  if (compact) {
    return <div>{form}</div>;
  }

  return (
    <section className="relative z-30 px-6 py-20 border-t border-neutral-900 bg-black">
      <div className="container mx-auto max-w-3xl text-center">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-3">next drop</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          VISO .02 is in the lab.
        </h2>
        <p className="text-neutral-400 mb-8">
          Get notified when .02 ships. No marketing. One email, one link.
        </p>
        <div className="flex justify-center">{form}</div>
      </div>
    </section>
  );
}
