import { FAQ } from '@/lib/faq';

export default function Faq() {
  return (
    <section id="faq" className="relative z-30 px-6 py-24 md:py-32 border-t border-neutral-900">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-14">
          <p className="text-sm text-neutral-500 uppercase tracking-widest mb-3">faq</p>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none">
            questions, <span className="text-neutral-500">answered.</span>
          </h2>
        </div>
        <div className="divide-y divide-neutral-900 border-y border-neutral-900">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5 cursor-pointer">
              <summary className="flex items-center justify-between gap-6 list-none">
                <span className="text-lg font-medium">{item.q}</span>
                <span className="text-neutral-500 text-2xl font-light transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-neutral-400 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
