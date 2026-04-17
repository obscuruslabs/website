import Link from 'next/link';

export const metadata = { title: 'order received — obscurus labs' };

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
          order received
        </p>
        <h1 className="text-5xl font-bold tracking-tighter mb-6">
          thank you.
        </h1>
        <p className="text-neutral-400 leading-relaxed mb-10">
          Your VISO .01 &lsquo;Ghost&rsquo; is queued for assembly. A confirmation
          email is on its way. Tracking follows within 48 hours.
        </p>
        <Link
          href="/"
          className="inline-block border border-neutral-700 px-6 py-3 rounded-xl hover:bg-neutral-900 transition-colors"
        >
          back to site
        </Link>
      </div>
    </main>
  );
}
