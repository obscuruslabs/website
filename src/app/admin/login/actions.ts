'use server';

import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { signAdminToken } from '@/lib/admin-token';
import { isAdmin } from '@/lib/admin-allowlist';
import { adminMagicLinkEmail } from '@/lib/emails/admin-magic-link';
import { SITE_URL } from '@/lib/env';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quiet allowlist: any syntactically valid email returns the same
// "?sent=1" response. Only allowlisted emails actually receive a link.
// Non-allowlisted attempts are logged for ops.
export async function requestMagicLink(formData: FormData) {
  const raw = formData.get('email');
  const email = typeof raw === 'string' ? raw.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    redirect('/admin/login?error=invalid');
  }

  if (!isAdmin(email)) {
    console.warn('[admin] login attempt for non-allowlisted email', { email });
    redirect('/admin/login?sent=1');
  }

  try {
    const token = await signAdminToken(email);
    const loginUrl = `${SITE_URL}/admin/auth/verify?token=${encodeURIComponent(token)}`;
    const { html, text } = adminMagicLinkEmail({ loginUrl });
    await sendEmail({
      to: email,
      subject: 'Sign in to obscurus labs admin',
      html,
      text,
    });
    console.log('[admin] magic link sent', email);
  } catch (err) {
    console.error('[admin] magic link send failed', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  redirect('/admin/login?sent=1');
}
