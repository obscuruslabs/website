import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', '/terms', '/privacy', '/returns', '/shipping', '/contact'];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.5,
  }));
}
