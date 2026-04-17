export const metadata = { title: 'shipping — obscurus labs' };

export default function ShippingPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Shipping</h1>
      <p className="text-sm text-neutral-500 mb-10">Unmarked packaging. Tracked delivery.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">United States</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Free USPS Priority Mail on every order. 2&ndash;3 business day delivery. Tracking emailed at label creation.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">International</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Flat <span className="text-white">$35</span> via DHL Express. 3&ndash;7 business days. Duties and VAT are
        collected at checkout where we can; otherwise billed on delivery.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Packaging</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Shipments go out in unmarked kraft mailers. The return label uses our fulfillment address,
        not the brand name.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Destinations we don&rsquo;t ship to</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        We cannot ship to jurisdictions under U.S. OFAC sanctions or to P.O. boxes requiring signature.
      </p>
    </>
  );
}
