import { formatPrice } from '@/lib/product';

export function orderConfirmationEmail(args: {
  orderId: string;
  amountCents: number;
  customerName?: string;
}) {
  const name = args.customerName ?? 'friend';
  const price = formatPrice(args.amountCents);
  const html = `
    <div style="font-family: -apple-system, Inter, sans-serif; background:#0A0A0A; color:#EDEDED; padding:32px;">
      <div style="max-width:560px; margin:0 auto;">
        <div style="font-size:20px; letter-spacing:-0.04em;">obscurus <span style="color:#737373">labs</span></div>
        <h1 style="font-size:28px; margin:32px 0 16px; letter-spacing:-0.04em;">Your order is in, ${name}.</h1>
        <p style="color:#A3A3A3; line-height:1.6;">
          One pair of VISO .01 &ldquo;Ghost&rdquo; — ${price}. Order #${args.orderId}.
        </p>
        <p style="color:#A3A3A3; line-height:1.6;">
          Your frames ship within 2 business days via USPS Priority. Tracking lands in your inbox the moment they leave our lab.
        </p>
        <p style="color:#A3A3A3; line-height:1.6; border-top:1px solid #262626; margin-top:32px; padding-top:16px; font-size:13px;">
          Questions: just reply. A human reads every message.
        </p>
      </div>
    </div>
  `;
  const text = `Your order is in, ${name}.

One pair of VISO .01 "Ghost" — ${price}. Order #${args.orderId}.

Your frames ship within 2 business days via USPS Priority. Tracking lands in your inbox the moment they leave our lab.

Questions: just reply. A human reads every message.

— obscurus labs`;
  return { html, text };
}
