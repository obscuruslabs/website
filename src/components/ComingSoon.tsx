import Waitlist from './Waitlist';

export default function ComingSoon() {
  return (
    <main className="min-h-screen flex flex-col selection:bg-purple-500/30 bg-[#0A0A0A] text-[#EDEDED]">
      <nav className="px-8 py-6">
        <div className="font-branding text-xl lowercase tracking-tight">
          obscurus <span className="text-neutral-500">labs</span>
        </div>
      </nav>
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-xl w-full">
          <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
            arriving soon
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none mb-6">
            take back<br />
            <span className="text-neutral-500">your face.</span>
          </h1>
          <p className="text-lg text-neutral-400 mb-10 leading-relaxed">
            Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.
            VISO .01 &apos;Ghost&apos; ships this summer.
          </p>
          <Waitlist compact />
        </div>
      </section>
      <footer className="border-t border-neutral-900 px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
        <span className="font-branding lowercase">obscurus labs</span>
        <span>&copy; {new Date().getFullYear()} obscurus labs</span>
      </footer>
    </main>
  );
}
