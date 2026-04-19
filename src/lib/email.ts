import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
export const resend = key ? new Resend(key) : null;

export const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'obscurus labs <hello@obscuruslabs.com>';
export const WAITLIST_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID ?? '';

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send', args.subject);
    return { skipped: true as const };
  }
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    ...args,
  });
  if (error) throw new Error(error.message);
  return { skipped: false as const, id: data?.id };
}

// Adds an email to the persistent waitlist audience in Resend. Idempotent on
// the Resend side: creating a contact with an existing email updates it
// (rather than erroring). Caller is responsible for catching and logging so a
// failure here doesn't block the user-facing success response.
export async function addToWaitlistAudience(email: string) {
  if (!resend) {
    console.warn('[waitlist audience] RESEND_API_KEY not set — skipping');
    return { skipped: true as const };
  }
  if (!WAITLIST_AUDIENCE_ID) {
    console.warn('[waitlist audience] RESEND_AUDIENCE_ID not set — skipping');
    return { skipped: true as const };
  }
  const { data, error } = await resend.contacts.create({
    email,
    audienceId: WAITLIST_AUDIENCE_ID,
    unsubscribed: false,
  });
  if (error) throw new Error(error.message);
  return { skipped: false as const, id: data?.id };
}
