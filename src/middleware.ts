import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/admin-session';
import { isAdmin } from '@/lib/admin-allowlist';

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? '';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? '';
const BASIC_AUTH_ENABLED = Boolean(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD);
const NOINDEX = process.env.NOINDEX === 'true';

// Sub-paths under /admin that don't need a session: the login form
// itself, the magic-link verify endpoint, and the logout endpoint.
// Everything else under /admin requires a valid session whose email
// is still in the allowlist.
const ADMIN_PUBLIC_PATHS = new Set([
  '/admin/login',
  '/admin/auth/verify',
  '/admin/logout',
]);

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="obscurus", charset="UTF-8"',
    },
  });
}

function checkBasicAuth(req: NextRequest): boolean {
  const header = req.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('basic ')) return false;
  const decoded = atob(header.slice(6));
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  return user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASSWORD;
}

async function adminGate(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return null;
  // Server actions submitted from /admin/login POST back to the same
  // path with a Next-Action header — letting the pathname through
  // regardless of method covers both the GET form and the action POST.
  if (ADMIN_PUBLIC_PATHS.has(pathname)) return null;

  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  const result = await verifySession(raw);
  if (!result.ok || !isAdmin(result.email)) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  return null;
}

export async function middleware(req: NextRequest) {
  if (BASIC_AUTH_ENABLED && !checkBasicAuth(req)) {
    return unauthorized();
  }

  const gated = await adminGate(req);
  if (gated) return gated;

  const res = NextResponse.next();
  if (NOINDEX) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: [
    // Skip the Stripe webhook — it must not be password-protected.
    '/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
};
