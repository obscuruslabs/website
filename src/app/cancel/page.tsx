import Link from 'next/link';

export const metadata = { title: 'checkout cancelled — obscurus labs' };

export default function CancelPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
          checkout cancelled
        </p>
        <h1 className="text-5xl font-bold tracking-tighter mb-6">
          no charge.
        </h1>
        <p className="text-neutral-400 leading-relaxed mb-10">
          You closed the window before completing the purchase. Your cart is
          empty. Come back any time.
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
