import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail, addToWaitlistAudience } from '@/lib/email';
import { waitlistConfirmationEmail } from '@/lib/emails/waitlist-confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always returns { ok: true } for any syntactically valid email. The signup
// intent is captured in Fly logs AND in the Resend audience, so even when a
// downstream call errors or is rate-limited, we don't lose the lead and the
// user never sees a failure. Audience add + confirmation send failures each
// log separately with enough context to replay.
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

  console.log('[waitlist] subscribe', email);

  // Add to the persistent Resend audience. This is the durable signup record.
  try {
    await addToWaitlistAudience(email);
  } catch (err) {
    console.error('[waitlist] audience add failed — signup still in logs', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fire confirmation email. Intentionally independent of audience add; a
  // failed add shouldn't block the email, and vice versa.
  try {
    const { html, text } = waitlistConfirmationEmail();
    await sendEmail({
      to: email,
      subject: "you're on the obscurus waitlist",
      html,
      text,
    });
  } catch (err) {
    console.error('[waitlist] confirmation email failed — signup retained', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
