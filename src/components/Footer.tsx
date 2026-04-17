import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative z-30 border-t border-neutral-900 px-8 py-10">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between text-xs text-neutral-500">
        <div className="font-branding lowercase text-lg text-neutral-300">obscurus labs</div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/shipping" className="hover:text-white transition-colors">shipping</Link>
          <Link href="/returns" className="hover:text-white transition-colors">returns</Link>
          <Link href="/terms" className="hover:text-white transition-colors">terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">privacy</Link>
          <Link href="/contact" className="hover:text-white transition-colors">contact</Link>
        </nav>
        <span>&copy; {new Date().getFullYear()} obscurus labs, inc.</span>
      </div>
    </footer>
  );
}
