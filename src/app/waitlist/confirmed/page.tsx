import Link from 'next/link';

export const metadata = {
  title: 'waitlist confirmed — obscurus labs',
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ email?: string }> };

export default async function ConfirmedPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
          confirmed
        </p>
        <h1 className="text-5xl font-bold tracking-tighter mb-6">
          you&rsquo;re on the list.
        </h1>
        <p className="text-neutral-400 leading-relaxed mb-4">
          {email ? (
            <>
              <span className="text-neutral-200">{email}</span> is now on the
              VISO .02 waitlist.
            </>
          ) : (
            <>Your email is now on the VISO .02 waitlist.</>
          )}
        </p>
        <p className="text-neutral-500 text-sm leading-relaxed mb-10">
          We&rsquo;ll send exactly one email when .02 ships. No marketing, no
          digests, no &ldquo;just checking in.&rdquo;
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
