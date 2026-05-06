# Waitlist email not delivered — 2026-04-23

## Symptom

- `peertoken@gmail.com` (submitter) submitted the waitlist form on prod at
  `2026-04-23T07:40:18Z` with address `jonanscheffler@gmail.com`.
- Fly prod logs (`obscuruslabs`, machine `32872d65a457d8`, region `iad`) show:
  `[waitlist] subscribe jonanscheffler@gmail.com`
- No `[waitlist] audience add failed` or `[waitlist] confirmation email failed`
  log lines — so both Resend calls returned without throwing.
- User reports: no email arrived (not in inbox; unclear whether spam folder
  was checked — we should confirm).

## Hypotheses, ranked most → least likely

1. **Domain not (fully) verified at Resend.** `obscuruslabs.com` needs SPF,
   DKIM, and (for Gmail bulk) DMARC records. Partially verified domains often
   yield API success but bounced / held sends.
2. **Verified, but DMARC misalignment or missing `List-Unsubscribe`.** Gmail
   RFC-8058 rules since Feb 2024 silently drop bulk mail without proper
   headers.
3. **Delivered but filtered to Gmail Spam / Promotions.** Cheapest to rule
   out; just ask the user to check.
4. **`EMAIL_FROM` on prod points at an unverified domain (`hello@obscuruslabs.com`),
   so Resend rejected the send** — but we'd expect an error log. Still worth
   verifying the prod secret value matches `obscuruslabs.com`.
5. **Template renders empty / malformed** ([lib/emails/waitlist-confirmation](../../src/lib/emails/)),
   so the provider accepted but produced a 0-byte or malformed payload.
   Unlikely; code path is trivial.

## Diagnostic plan (in order)

Each step that can be done from this shell uses the prod `RESEND_API_KEY`
from `.env.local`. No writes; read-only diagnostics.

1. **Confirm Resend domain verification.**
   `GET https://api.resend.com/domains` — check `obscuruslabs.com` status,
   SPF/DKIM/MX records.
2. **Confirm contact landed in the waitlist audience.**
   `GET https://api.resend.com/audiences/{RESEND_AUDIENCE_ID}/contacts` —
   look for `jonanscheffler@gmail.com`.
3. **Find the actual send and its delivery status.**
   Resend's public REST API does not expose a list-emails endpoint; the only
   programmatic way is `GET /emails/{id}`, which requires the ID we would
   have logged. We don't log it today (gap noted below). Fall back to the
   Resend dashboard (`https://resend.com/emails`) — ask user to screenshot
   or read the status of the most recent send to that address.
4. **Verify the prod `EMAIL_FROM` matches a verified sender.**
   `flyctl ssh console -a obscuruslabs -C "printenv EMAIL_FROM"` — compare
   to the verified domain(s) from step 1.
5. **Inspect the confirmation template** for obvious bugs.

## Followup work (independent of root cause)

- **Log the Resend message ID** from `sendEmail` and the contact ID from
  `addToWaitlistAudience`. Right now we log on failure but not success, so
  we can't correlate a submission to a Resend record without the dashboard.
  Cheap change to [src/lib/email.ts](../../src/lib/email.ts) and
  [src/app/api/waitlist/route.ts](../../src/app/api/waitlist/route.ts).
- **Surface a deliverability probe in staging.** One-shot script that sends
  a test email and prints the ID so we can poll `/emails/{id}` for status
  during incidents.

## Decision point

- If domain unverified → add the missing DNS records at Porkbun, re-verify,
  resend. Keep the user's audience entry (already captured).
- If verified + dashboard shows `bounced`/`complained` → investigate the
  specific address; do not rebuild pipeline.
- If verified + dashboard shows `delivered` → user checks spam/promotions;
  also add `List-Unsubscribe` + `List-Unsubscribe-Post` headers for Gmail
  compliance.
