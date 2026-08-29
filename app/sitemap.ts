import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = getSiteUrl();
  const staticRoutes = [
    '',
    '/store/products',
    '/store/cart',
    '/store/search',
    '/store/flash-sale',
  ];
  const now = new Date();
  return staticRoutes.map((r) => ({
    url: `${url}/store${r}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: r === '' ? 1 : 0.6,
  }));
  // TODO: when the catalog API exists, also include dynamic product, category,
  // and brand URLs (e.g. fetch from GET /api/v1/storefront/products?per_page=...)
}
