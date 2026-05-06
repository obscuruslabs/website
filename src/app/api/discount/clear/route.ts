import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/env';

// Clears the discount cookie and redirects home. POST so accidental
// link prefetches don't drop the discount.
export async function POST() {
  const res = NextResponse.redirect(new URL('/', SITE_URL), { status: 303 });
  res.cookies.set('discount_code', '', { maxAge: 0, path: '/' });
  return res;
}
