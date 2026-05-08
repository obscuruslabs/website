import { requestMagicLink } from './actions';

export const metadata = {
  title: 'admin sign-in — obscurus labs',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

const ERROR_COPY: Record<string, string> = {
  expired: 'That link has expired. Request a new one below.',
  invalid: 'That link wasn’t valid. Request a new one below.',
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { sent, error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <p className="text-sm text-neutral-500 uppercase tracking-widest mb-3">
          obscurus admin
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-8">sign in</h1>

        {sent === '1' && (
          <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            If that email is allowed, a sign-in link is on its way. Check
            your inbox.
          </div>
        )}
        {error && ERROR_COPY[error] && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {ERROR_COPY[error]}
          </div>
        )}

        <form action={requestMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            autoFocus
            placeholder="you@domain.com"
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-base placeholder:text-neutral-600 focus:outline-none focus:border-purple-600"
          />
          <button
            type="submit"
            className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-purple-600 hover:text-white transition-colors"
          >
            email me a sign-in link
          </button>
        </form>

        <p className="mt-6 text-xs text-neutral-500 leading-relaxed">
          Links expire in 30 minutes. Only allowlisted operators can sign in.
        </p>
      </div>
    </main>
  );
}
