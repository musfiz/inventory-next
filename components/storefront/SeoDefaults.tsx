'use client';

import { useSeo } from '@/lib/utils/use-seo';
import { organizationJsonLd, websiteJsonLd } from '@/lib/utils/seo';

/**
 * Injects site-wide structured data (Organization + WebSite) into <head>.
 * Rendered once in the storefront layout. Uses persistent (non-page-level)
 * JSON-LD so per-page useSeo() calls don't clear it, and skips meta tags so it
 * never overrides a page's own title/OG values.
 */
export function SeoDefaults() {
  useSeo({
    jsonLd: [websiteJsonLd(), organizationJsonLd()],
    siteJsonLd: true,
    meta: false,
  });
  return null;
}
