// Transactional-shaped magic-link email. Mirrors waitlist-confirm-link
// in tone — one short paragraph, one CTA, no marketing chrome. Designed
// to land in Gmail Primary, not Promotions.

export function adminMagicLinkEmail(args: { loginUrl: string }) {
  const { loginUrl } = args;
  const html = `
    <div style="font-family: -apple-system, Inter, sans-serif; color:#111; padding:24px;">
      <div style="max-width:520px; margin:0 auto;">
        <p style="font-size:15px; line-height:1.6; margin:0 0 20px;">
          Sign in to obscurus labs admin:
        </p>
        <p style="margin:0 0 24px;">
          <a href="${loginUrl}"
             style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">
            Sign in
          </a>
        </p>
        <p style="font-size:13px; color:#666; line-height:1.6; margin:0 0 6px;">
          Or paste this link into your browser:
        </p>
        <p style="font-size:13px; color:#666; line-height:1.6; margin:0 0 24px; word-break:break-all;">
          ${loginUrl}
        </p>
        <p style="font-size:12px; color:#999; line-height:1.6; margin:0;">
          The link expires in 30 minutes. If you didn&rsquo;t request this, ignore this email.
        </p>
      </div>
    </div>
  `;
  const text = `Sign in to obscurus labs admin:

${loginUrl}

The link expires in 30 minutes. If you didn't request this, ignore this email.`;
  return { html, text };
}
