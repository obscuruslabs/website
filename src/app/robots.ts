import type { MetadataRoute } from 'next';
import { NOINDEX, SITE_URL } from '@/lib/env';

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
