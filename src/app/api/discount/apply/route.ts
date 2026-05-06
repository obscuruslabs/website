import { NextResponse, type NextRequest } from 'next/server';
import { lookupPromoCode, normalizeCode } from '@/lib/discount';
import { SITE_URL } from '@/lib/env';

// Validates a code from `?code=…`, sets a 7-day cookie if valid, and
// redirects back to `/`. Invalid/expired codes redirect to `/?invalid=…`
// (no cookie set) so the homepage can surface the failure.
//
// Why a route handler instead of doing it inline in page.tsx: server
// components can read cookies but not set them. A route handler can.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('code') ?? '';
  const code = normalizeCode(raw);

  if (!code) {
    return NextResponse.redirect(new URL('/', SITE_URL));
  }

  const info = await lookupPromoCode(code);
  if (!info) {
    return NextResponse.redirect(
      new URL(`/?invalid=${encodeURIComponent(code)}`, SITE_URL),
    );
  }

  const res = NextResponse.redirect(new URL('/', SITE_URL));
  res.cookies.set('discount_code', info.code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
