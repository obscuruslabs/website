const PILLARS = [
  {
    title: 'IR bloom',
    body:
      'Six infrared LEDs at 940nm — wash out the CMOS sensors used in almost all consumer and commercial cameras that use non visible IR light. The glasses emit a light source brighter enough to obscure than your entire face when pointed at an IR camera.',
  },
  {
    title: 'Invisible to you',
    body:
      'Human eyes cut off around 700nm. at 950nm the LEDs are invisible to bystanders.',
  },
  {
    title: 'No radio nor jamming tech',
    body:
      'The ghost glasses does not jam or transmit any light that would, go against any laws by the FCC or any in the US.',
  },
  {
    title: 'Built for repair',
    body:
      'User-replaceable CR2032 cell. Standard hex screws for the battery casing. We publish the service manual.',
  },
];

export default function Tech() {
  return (
    <section id="tech" className="relative z-30 px-6 py-24 md:py-32 border-t border-neutral-900 bg-black">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-14">
          <p className="text-sm text-neutral-500 uppercase tracking-widest mb-3">the tech</p>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none">
            how it <span className="text-neutral-500">disappears.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="flex gap-6">
              <div className="text-5xl font-branding text-neutral-700 leading-none">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">{p.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 border border-neutral-900 rounded-xl p-6 text-sm text-neutral-500">
          Independent compatibility testing against 47 camera models is published and
          updated monthly. Sensors with aggressive IR-cut filters (flagship smartphones,
          some newer DSLRs) attenuate — they do not eliminate — the effect. Ghost is a
          tool, not magic.
        </div>
      </div>
    </section>
  );
}
