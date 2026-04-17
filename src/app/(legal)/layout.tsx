import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="px-8 py-6 border-b border-neutral-900">
        <Link href="/" className="font-branding text-xl lowercase tracking-tight">
          obscurus <span className="text-neutral-500">labs</span>
        </Link>
      </nav>
      <article className="flex-1 px-6 py-16">
        <div className="container mx-auto max-w-2xl prose prose-invert prose-neutral">
          {children}
        </div>
      </article>
      <footer className="border-t border-neutral-900 px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
        <Link href="/" className="font-branding lowercase hover:text-white transition-colors">
          obscurus labs
        </Link>
        <span>&copy; {new Date().getFullYear()} obscurus labs</span>
      </footer>
    </main>
  );
}
