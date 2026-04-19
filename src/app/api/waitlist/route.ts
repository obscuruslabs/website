import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { waitlistConfirmationEmail } from '@/lib/emails/waitlist-confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always returns { ok: true } for any syntactically valid email. The signup
// intent is captured in Fly logs (`[waitlist] subscribe <email>`), so even
// when Resend errors or is rate-limited, we don't lose the lead and the user
// never sees a failure. Email-send failures are logged separately with enough
// context to replay later.
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

  try {
    const { html, text } = waitlistConfirmationEmail();
    await sendEmail({
      to: email,
      subject: "you're on the obscurus waitlist",
      html,
      text,
    });
  } catch (err) {
    // The user already sees a success state. The email didn't go out, but the
    // signup is in the logs. A backfill job (or us, manually) can retry later.
    console.error('[waitlist] email send failed — signup retained', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
