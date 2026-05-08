import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-token';
import { isAdmin } from '@/lib/admin-allowlist';
import { setSessionCookie, signSession } from '@/lib/admin-session';
import { SITE_URL } from '@/lib/env';

// Verifies the magic-link token, re-checks the email against the
// allowlist (which may have shrunk since the link was issued), and on
// success sets the session cookie and redirects to /admin.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/admin/login?error=invalid', SITE_URL),
    );
  }

  const result = await verifyAdminToken(token);
  if (!result.ok) {
    console.warn('[admin] verify rejected', { reason: result.reason });
    return NextResponse.redirect(
      new URL(`/admin/login?error=${result.reason}`, SITE_URL),
    );
  }

  if (!isAdmin(result.email)) {
    console.warn('[admin] verify ok but email no longer in allowlist', {
      email: result.email,
    });
    return NextResponse.redirect(
      new URL('/admin/login?error=invalid', SITE_URL),
    );
  }

  const session = await signSession(result.email);
  const res = NextResponse.redirect(new URL('/admin', SITE_URL));
  setSessionCookie(res, session);
  console.log('[admin] signed in', result.email);
  return res;
}
