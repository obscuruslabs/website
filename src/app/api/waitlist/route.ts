import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { waitlistConfirmLinkEmail } from '@/lib/emails/waitlist-confirm-link';
import { signToken } from '@/lib/waitlist-token';
import { SITE_URL } from '@/lib/env';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Double-opt-in waitlist signup. We do NOT add the contact to the Resend
// audience here — that happens at /api/waitlist/confirm only after the user
// clicks the link in the email we send below. This keeps bots and typo'd
// addresses out of the audience and produces a transactional-shaped first
// email that's more likely to land in Gmail Primary than Promotions.
//
// Always returns { ok: true } for any syntactically valid email so the form
// never reveals downstream failures. Send failures log separately with
// enough context to replay.
export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = (await req.json()) as { email?: unknown };
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  console.log('[waitlist] signup-requested', email);

  try {
    const token = await signToken(email);
    const confirmUrl = `${SITE_URL}/api/waitlist/confirm?token=${encodeURIComponent(token)}`;
    const { html, text } = waitlistConfirmLinkEmail({ confirmUrl });
    await sendEmail({
      to: email,
      subject: 'Confirm your email — obscurus labs',
      html,
      text,
    });
  } catch (err) {
    console.error('[waitlist] confirm-link send failed', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
