import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from '@/lib/admin-session';

// Middleware already gates this route. We read the session here purely
// to display who's signed in — the gate decision was made upstream.
export default async function AdminHome() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await verifySession(raw) : null;
  const email = session?.ok ? session.email : '';

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-900">
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-widest">
              obscurus admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              signed in as {email || 'unknown'}
            </h1>
          </div>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="text-sm border border-neutral-800 px-4 py-2 rounded-xl hover:bg-neutral-900 transition-colors"
            >
              sign out
            </button>
          </form>
        </header>

        <section>
          <p className="text-neutral-400 leading-relaxed">
            This is the admin shell. Operator tools (single-use discount
            codes, sales list, kill-switch) will land here next.
          </p>
        </section>
      </div>
    </main>
  );
}
