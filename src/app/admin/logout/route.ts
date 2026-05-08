import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/admin-session';
import { SITE_URL } from '@/lib/env';

export async function POST() {
  const res = NextResponse.redirect(new URL('/admin/login', SITE_URL), {
    status: 303,
  });
  clearSessionCookie(res);
  return res;
}
