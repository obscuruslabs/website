import { formatPrice, type Sku } from '@/lib/product';

type Args = {
  orderId: string;
  amountCents: number;
  customerName?: string;
  sku?: Sku;
};

export function orderConfirmationEmail(args: Args) {
  if (args.sku === 'viso-prototype') return prototypeEmail(args);
  return ghostEmail(args);
}

function ghostEmail(args: Args) {
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

function prototypeEmail(args: Args) {
  const name = args.customerName ?? 'friend';
  const price = formatPrice(args.amountCents);
  const html = `
    <div style="font-family: -apple-system, Inter, sans-serif; background:#0A0A0A; color:#EDEDED; padding:32px;">
      <div style="max-width:560px; margin:0 auto;">
        <div style="font-size:20px; letter-spacing:-0.04em;">obscurus <span style="color:#737373">labs</span></div>
        <h1 style="font-size:28px; margin:32px 0 16px; letter-spacing:-0.04em;">A prototype is on the bench for you, ${name}.</h1>
        <p style="color:#A3A3A3; line-height:1.6;">
          One VISO Prototype — ${price} (incl. shipping). Order #${args.orderId}.
        </p>
        <p style="color:#A3A3A3; line-height:1.6;">
          These are real units from our lab — hand-built, fully functional, with the rough edges
          you'd expect from a pre-production run. Yours ships within 5 business days via USPS Priority,
          or international mail if outside the U.S. Tracking follows by email.
        </p>
        <p style="color:#A3A3A3; line-height:1.6;">
          When VISO .01 ships this summer, prototype owners get first crack at the production run
          and a 15% discount code. We'll be in touch.
        </p>
        <p style="color:#A3A3A3; line-height:1.6; border-top:1px solid #262626; margin-top:32px; padding-top:16px; font-size:13px;">
          Questions or feedback as you wear it: just reply. A human reads every message.
        </p>
      </div>
    </div>
  `;
  const text = `A prototype is on the bench for you, ${name}.

One VISO Prototype — ${price} (incl. shipping). Order #${args.orderId}.

These are real units from our lab — hand-built, fully functional, with the rough edges you'd expect from a pre-production run. Yours ships within 5 business days via USPS Priority, or international mail if outside the U.S. Tracking follows by email.

When VISO .01 ships this summer, prototype owners get first crack at the production run and a 15% discount code. We'll be in touch.

Questions or feedback as you wear it: just reply. A human reads every message.

— obscurus labs`;
  return { html, text };
}

export function orderEmailSubject(sku?: Sku) {
  return sku === 'viso-prototype'
    ? 'your VISO prototype is on the bench'
    : 'your VISO .01 is on the way';
}
