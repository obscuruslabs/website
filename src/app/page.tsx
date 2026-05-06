import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Product from '@/components/Product';
import Tech from '@/components/Tech';
import Faq from '@/components/Faq';
import Waitlist from '@/components/Waitlist';
import Footer from '@/components/Footer';
import ComingSoon from '@/components/ComingSoon';
import { type DiscountBannerProps } from '@/components/DiscountBanner';
import { lookupPromoCode, normalizeCode } from '@/lib/discount';
import { SITE_MODE } from '@/lib/env';

// Read SITE_MODE at request time. If this were statically pre-rendered, the
// build-time value (unset → coming_soon) would be baked in, and flipping the
// Fly secret at runtime would have no effect.
export const dynamic = 'force-dynamic';

type SP = { code?: string; invalid?: string };

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  // `?code=…` always routes through the apply handler, which validates,
  // sets the cookie if valid, and redirects either back to `/` (success)
  // or `/?invalid=…` (failure). This is the only way to set cookies from
  // a server-rendered entry point.
  if (sp.code) {
    redirect(`/api/discount/apply?code=${encodeURIComponent(sp.code)}`);
  }

  if (SITE_MODE !== 'coming_soon') {
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

  let banner: DiscountBannerProps | undefined;
  if (sp.invalid) {
    banner = { kind: 'invalid', code: normalizeCode(sp.invalid) };
  } else {
    const cookieStore = await cookies();
    const cookieCode = cookieStore.get('discount_code')?.value;
    if (cookieCode) {
      const info = await lookupPromoCode(cookieCode);
      if (info) {
        banner = { kind: 'applied', code: info.code, percentOff: info.percentOff };
      }
      // If the cookie code is no longer valid, render without a banner.
      // The PrototypeCard's own lookup will agree, and the buy goes
      // through at full price. The cookie eventually expires on its own.
    }
  }

  return <ComingSoon banner={banner} />;
}
