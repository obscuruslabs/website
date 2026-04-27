import Link from 'next/link';

export const metadata = {
  title: 'waitlist link expired — obscurus labs',
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ reason?: string }> };

const COPY: Record<string, { eyebrow: string; headline: string; body: string }> = {
  expired: {
    eyebrow: 'link expired',
    headline: 'this link is too old.',
    body:
      'Confirmation links expire after 7 days. Submit your email again on the home page and we’ll send a fresh one.',
  },
  invalid: {
    eyebrow: 'link invalid',
    headline: 'we couldn’t verify this link.',
    body:
      'The token didn’t match what we issued. This usually means the link was truncated by your mail client. Submit your email again and try the new link.',
  },
};

export default async function WaitlistErrorPage({ searchParams }: PageProps) {
  const { reason } = await searchParams;
  const copy = (reason && COPY[reason]) || COPY.invalid;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
          {copy.eyebrow}
        </p>
        <h1 className="text-5xl font-bold tracking-tighter mb-6">
          {copy.headline}
        </h1>
        <p className="text-neutral-400 leading-relaxed mb-10">{copy.body}</p>
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
