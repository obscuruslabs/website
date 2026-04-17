import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { waitlistConfirmationEmail } from '@/lib/emails/waitlist-confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: unknown };
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    console.log('[waitlist] subscribe', email);

    const { html, text } = waitlistConfirmationEmail();
    await sendEmail({
      to: email,
      subject: "you're on the obscurus waitlist",
      html,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] failed', err);
    return NextResponse.json({ error: 'subscribe failed' }, { status: 500 });
  }
}
