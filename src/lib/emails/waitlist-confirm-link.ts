// Transactional-shaped confirmation email. One short paragraph, one CTA,
// no marketing chrome. Designed to land in Gmail Primary rather than
// Promotions.

export function waitlistConfirmLinkEmail(args: { confirmUrl: string }) {
  const { confirmUrl } = args;
  const html = `
    <div style="font-family: -apple-system, Inter, sans-serif; color:#111; padding:24px;">
      <div style="max-width:520px; margin:0 auto;">
        <p style="font-size:15px; line-height:1.6; margin:0 0 20px;">
          Confirm your email to join the obscurus labs waitlist:
        </p>
        <p style="margin:0 0 24px;">
          <a href="${confirmUrl}"
             style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">
            Confirm email
          </a>
        </p>
        <p style="font-size:13px; color:#666; line-height:1.6; margin:0 0 6px;">
          Or paste this link into your browser:
        </p>
        <p style="font-size:13px; color:#666; line-height:1.6; margin:0 0 24px; word-break:break-all;">
          ${confirmUrl}
        </p>
        <p style="font-size:12px; color:#999; line-height:1.6; margin:0;">
          The link expires in 7 days. If you didn&rsquo;t request this, ignore this email.
        </p>
      </div>
    </div>
  `;
  const text = `Confirm your email to join the obscurus labs waitlist:

${confirmUrl}

The link expires in 7 days. If you didn't request this, ignore this email.`;
  return { html, text };
}
