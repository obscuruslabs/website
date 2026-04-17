export function waitlistConfirmationEmail() {
  const html = `
    <div style="font-family: -apple-system, Inter, sans-serif; background:#0A0A0A; color:#EDEDED; padding:32px;">
      <div style="max-width:560px; margin:0 auto;">
        <div style="font-size:20px; letter-spacing:-0.04em;">obscurus <span style="color:#737373">labs</span></div>
        <h1 style="font-size:28px; margin:32px 0 16px; letter-spacing:-0.04em;">You&rsquo;re on the list.</h1>
        <p style="color:#A3A3A3; line-height:1.6;">
          We&rsquo;ll send exactly one email when VISO .02 ships. No marketing, no digests, no &ldquo;just checking in.&rdquo;
        </p>
        <p style="color:#A3A3A3; line-height:1.6; font-size:13px; border-top:1px solid #262626; margin-top:32px; padding-top:16px;">
          Reply &ldquo;unsubscribe&rdquo; to this email if you change your mind. We won&rsquo;t miss you.
        </p>
      </div>
    </div>
  `;
  const text = `You're on the list.

We'll send exactly one email when VISO .02 ships. No marketing, no digests, no "just checking in."

Reply "unsubscribe" to this email if you change your mind. We won't miss you.

— obscurus labs`;
  return { html, text };
}
