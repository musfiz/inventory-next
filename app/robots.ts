import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/seo';

export default function robots(): MetadataRoute.Robots {
  const url = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/store/account/', '/store/checkout/', '/welcome'],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}
