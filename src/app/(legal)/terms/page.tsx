export const metadata = { title: 'terms of service — obscurus labs' };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-sm text-neutral-500 mb-10">Last updated: April 17, 2026</p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">1. Agreement</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        By purchasing from obscurus labs, you agree to these terms. If you disagree, don&rsquo;t purchase.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">2. Product use</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        VISO frames emit near-infrared light in accordance with IEC 62471 Risk Group Exempt classification.
        You are responsible for compliance with local laws and venue policies. We do not claim the product
        will render you invisible to every imaging system.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">3. Orders and payment</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Prices are in U.S. dollars. Payment is processed by Stripe; we do not store card data. We reserve
        the right to refuse any order.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">4. Warranty</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Two years on electronics, one year on frame finish. Excludes damage from drops, water beyond IPX4,
        or modification.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">5. Limitation of liability</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        We are liable up to the purchase price. We are not liable for any consequences of your use of the
        product, including but not limited to legal, professional, or personal outcomes.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">6. Governing law</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        These terms are governed by the laws of the State of Delaware.
      </p>

      <p className="text-sm text-neutral-500 mt-12">
        Questions: <a href="mailto:legal@obscuruslabs.com" className="underline hover:text-white">legal@obscuruslabs.com</a>
      </p>
    </>
  );
}
