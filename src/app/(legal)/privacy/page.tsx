export const metadata = { title: 'privacy — obscurus labs' };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-10">Last updated: April 17, 2026</p>

      <p className="text-neutral-400 leading-relaxed mb-6">
        Given what we make, we take privacy seriously. Here is exactly what we collect and why.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">What we collect</h2>
      <ul className="text-neutral-400 leading-relaxed mb-6 list-disc pl-6 space-y-2">
        <li>Order data: name, shipping address, email. Required to ship you frames.</li>
        <li>Payment is handled by Stripe. We never see your card number.</li>
        <li>Waitlist: only your email address.</li>
        <li>Analytics: Plausible, self-hosted. No cookies. No cross-site identifiers. Aggregate counts only.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">What we don&rsquo;t collect</h2>
      <ul className="text-neutral-400 leading-relaxed mb-6 list-disc pl-6 space-y-2">
        <li>No third-party trackers, pixels, or ad networks.</li>
        <li>No IP logs older than 24 hours outside of abuse investigations.</li>
        <li>No profile you can&rsquo;t delete.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Your rights</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Request a copy or deletion of your data by emailing <a href="mailto:privacy@obscuruslabs.com" className="underline hover:text-white">privacy@obscuruslabs.com</a>.
        We respond within 7 days and act within 30.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Subprocessors</h2>
      <ul className="text-neutral-400 leading-relaxed mb-6 list-disc pl-6 space-y-2">
        <li>Stripe, Inc. — payment processing</li>
        <li>Resend, Inc. — transactional email</li>
        <li>Fly.io — application hosting</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Changes</h2>
      <p className="text-neutral-400 leading-relaxed">
        We will post updates here and notify anyone with an order or waitlist entry in the previous 12 months.
      </p>
    </>
  );
}
