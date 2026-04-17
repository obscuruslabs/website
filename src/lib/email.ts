import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
export const resend = key ? new Resend(key) : null;

export const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'obscurus labs <hello@obscuruslabs.com>';

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
