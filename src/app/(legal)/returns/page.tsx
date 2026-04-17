export const metadata = { title: 'returns — obscurus labs' };

export default function ReturnsPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Returns</h1>
      <p className="text-sm text-neutral-500 mb-10">30 days, any reason.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Window</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        You have 30 days from delivery to request a return. Reason is not required.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Condition</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Frames must be returned unscratched and in the original case. Prescription lenses are final sale.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Label</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        We send a prepaid USPS label within one business day of your request.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Refund</h2>
      <p className="text-neutral-400 leading-relaxed mb-6">
        Refund hits your card within 5 business days of our receiving the return.
      </p>

      <p className="mt-12 text-neutral-400">
        Start a return: email <a href="mailto:returns@obscuruslabs.com" className="underline hover:text-white">returns@obscuruslabs.com</a> with your order number.
      </p>
    </>
  );
}
