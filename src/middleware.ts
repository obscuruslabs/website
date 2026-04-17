import { NextResponse, type NextRequest } from 'next/server';

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? '';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? '';
const BASIC_AUTH_ENABLED = Boolean(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD);
const NOINDEX = process.env.NOINDEX === 'true';

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

export function middleware(req: NextRequest) {
  if (BASIC_AUTH_ENABLED && !checkBasicAuth(req)) {
    return unauthorized();
  }

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
