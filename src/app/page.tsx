import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Product from '@/components/Product';
import Tech from '@/components/Tech';
import Faq from '@/components/Faq';
import Waitlist from '@/components/Waitlist';
import Footer from '@/components/Footer';
import ComingSoon from '@/components/ComingSoon';
import { SITE_MODE } from '@/lib/env';

// Read SITE_MODE at request time. If this were statically pre-rendered, the
// build-time value (unset → coming_soon) would be baked in, and flipping the
// Fly secret at runtime would have no effect.
export const dynamic = 'force-dynamic';

export default function Home() {
  if (SITE_MODE === 'coming_soon') {
    return <ComingSoon />;
  }

  return (
    <main className="min-h-screen flex flex-col selection:bg-purple-500/30">
      <Nav />
      <Hero />
      <Product />
      <Tech />
      <Faq />
      <Waitlist />
      <Footer />
    </main>
  );
}
