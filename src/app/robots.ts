import type { MetadataRoute } from 'next';
import { NOINDEX, SITE_URL } from '@/lib/env';

// Read NOINDEX / SITE_URL at request time, not build time — Fly [env] and
// secrets aren't present during `next build` on staging.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/success', '/cancel'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
