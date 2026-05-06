import Waitlist from './Waitlist';
import PrototypeCard from './PrototypeCard';

export default function ComingSoon() {
  return (
    <main className="min-h-screen flex flex-col selection:bg-purple-500/30 bg-[#0A0A0A] text-[#EDEDED]">
      <nav className="px-8 py-6">
        <div className="font-branding text-xl lowercase tracking-tight">
          obscurus <span className="text-neutral-500">labs</span>
        </div>
      </nav>
      <section className="flex-1 px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-sm text-neutral-500 uppercase tracking-widest mb-4">
              arriving soon
            </p>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter leading-none mb-6">
              take back<br />
              <span className="text-neutral-500">your face.</span>
            </h1>
            <p className="text-lg text-neutral-400 leading-relaxed">
              Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.
              VISO .01 &apos;Ghost&apos; ships this summer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <PrototypeCard />

            <div className="border border-neutral-800 rounded-2xl bg-neutral-950/50 p-8 flex flex-col">
              <p className="text-xs text-neutral-500 uppercase tracking-widest mb-4">
                or join the waitlist
              </p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3">
                Hear when <span className="text-neutral-500">.01 ships.</span>
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                One email when VISO .01 &lsquo;Ghost&rsquo; is available. No
                marketing, no digests. We send a confirmation link first to keep
                the list clean.
              </p>
              <div className="mt-auto">
                <Waitlist compact />
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-neutral-900 px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
        <span className="font-branding lowercase">obscurus labs</span>
        <span>&copy; {new Date().getFullYear()} obscurus labs</span>
      </footer>
    </main>
  );
}
