import { NextResponse, type NextRequest } from 'next/server';
import { addToWaitlistAudience } from '@/lib/email';
import { verifyToken } from '@/lib/waitlist-token';
import { SITE_URL } from '@/lib/env';

// Confirms a waitlist signup. Reached when the user clicks the link in the
// confirmation email. Verifies the HMAC token, adds the contact to the Resend
// audience (idempotent — re-clicks are safe), and redirects to the branded
// landing page.
//
// On bad/expired tokens, redirects to /waitlist/error with a reason so the
// landing page can display copy appropriate to each failure mode.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/waitlist/error?reason=invalid', SITE_URL),
    );
  }

  const result = await verifyToken(token);
  if (!result.ok) {
    console.warn('[waitlist] confirm rejected', { reason: result.reason });
    return NextResponse.redirect(
      new URL(`/waitlist/error?reason=${result.reason}`, SITE_URL),
    );
  }

  const { email } = result;

  try {
    await addToWaitlistAudience(email);
    console.log('[waitlist] confirmed', email);
  } catch (err) {
    // We still redirect to the success page — the signup intent is captured
    // and we'd rather show success than expose a transient Resend failure.
    // The error log gives us enough to replay.
    console.error('[waitlist] audience add failed at confirm', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.redirect(
    new URL(
      `/waitlist/confirmed?email=${encodeURIComponent(email)}`,
      SITE_URL,
    ),
  );
}
