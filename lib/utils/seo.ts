/**
 * Framework-agnostic SEO helpers for the storefront. Pure functions only
 * (no React), so they can be imported by both server route handlers
 * (sitemap/robots) and client components.
 */

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:9000'
  ).replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
}

const DEFAULT_SITE_NAME = 'Online Store';

/** Set once the real store name loads from the backend (see `SeoDefaults`). */
let currentSiteName = DEFAULT_SITE_NAME;

export function setSiteName(name?: string | null) {
  currentSiteName = name?.trim() || DEFAULT_SITE_NAME;
}

export function getSiteName(): string {
  return currentSiteName;
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: getSiteName(),
    url,
    logo: `${url}/logo.png`,
  };
}

export function websiteJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url,
  };
}

export function productJsonLd(p: {
  name: string;
  description?: string;
  image?: string | string[];
  url?: string;
  sku?: string;
  price?: number;
  currency?: string;
  availability?: boolean;
  brand?: string;
}) {
  const image = Array.isArray(p.image) ? p.image[0] : p.image;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: image ? absoluteUrl(image) : undefined,
    sku: p.sku,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: p.currency || 'BDT',
      availability: p.availability
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: p.url ? absoluteUrl(p.url) : undefined,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}
