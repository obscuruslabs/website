const PILLARS = [
  {
    title: 'IR bloom',
    body:
      'Twelve near-infrared emitters — six at 850nm, six at 940nm — wash out the CMOS sensors used in 98% of consumer and commercial cameras. The frame becomes a light source brighter than your face.',
  },
  {
    title: 'Invisible to you',
    body:
      'Human eyes cut off around 700nm. The LEDs are dark to bystanders. No glow, no indicator, no tell. The person next to you will not know they are on.',
  },
  {
    title: 'No radio, no jam',
    body:
      'Ghost does not jam, record, or transmit. It emits light — legal in every jurisdiction we operate in. No FCC license, no signal interference, no paper trail.',
  },
  {
    title: 'Built for repair',
    body:
      'User-replaceable 18650 cell. Standard Torx screws. We publish the service manual. Your hardware, not ours.',
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
