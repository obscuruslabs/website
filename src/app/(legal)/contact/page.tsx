export const metadata = { title: 'contact — obscurus labs' };

export default function ContactPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Contact</h1>
      <p className="text-sm text-neutral-500 mb-10">Humans, not queues.</p>

      <div className="space-y-6 text-neutral-300">
        <div>
          <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">general</div>
          <a href="mailto:hello@obscuruslabs.com" className="underline hover:text-white">hello@obscuruslabs.com</a>
        </div>
        <div>
          <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">support</div>
          <a href="mailto:support@obscuruslabs.com" className="underline hover:text-white">support@obscuruslabs.com</a>
        </div>
        <div>
          <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">press</div>
          <a href="mailto:press@obscuruslabs.com" className="underline hover:text-white">press@obscuruslabs.com</a>
        </div>
        <div>
          <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">security</div>
          <a href="mailto:security@obscuruslabs.com" className="underline hover:text-white">security@obscuruslabs.com</a>
          <p className="text-sm text-neutral-500 mt-1">PGP key available on request. 72-hour SLA.</p>
        </div>
        <div>
          <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">mailing</div>
          <p>obscurus labs, inc.<br />1309 Coffeen Ave STE 1200<br />Sheridan, WY 82801</p>
        </div>
      </div>
    </>
  );
}
