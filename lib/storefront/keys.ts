/**
 * Central SWR cache-key registry. Every read of the same endpoint MUST use the
 * same key so dedupe/cache sharing works across header, footer and pages.
 * Arrays are fine as keys (SWR serializes them) and let `mutate(prefix)` match.
 */
export const SK = {
  status: ['storefront:status'] as const,
  settings: ['storefront:settings'] as const,
  branding: ['storefront:branding'] as const,
  headerMenu: ['storefront:header-menu'] as const,
  footerConfig: ['storefront:footer-config'] as const,
  productCount: ['storefront:product-count'] as const,
  categories: ['storefront:categories'] as const,
  brands: ['storefront:brands'] as const,
  trending: ['storefront:trending', 8] as const,
  categoryBySlug: (slug: string) => ['storefront:category', slug] as const,
  productBySlug: (slug: string) => ['storefront:product', slug] as const,
  products: (params: Record<string, unknown>) => ['storefront:products', params] as const,
  related: (categoryId: string | number, productId: string) => ['storefront:related', categoryId, productId] as const,
  reviews: (slug: string, page: number) => ['storefront:reviews', slug, page] as const,
  flashSale: ['storefront:flash-sale'] as const,
  heroSliders: ['storefront:hero-sliders'] as const,
  offerSlides: ['storefront:offer-slides'] as const,
  search: (params: Record<string, unknown>) => ['storefront:search', params] as const,
  addresses: ['storefront:addresses'] as const,
  orders: ['storefront:orders'] as const,
  orderDetail: (uuid: string) => ['storefront:order', uuid] as const,
  order: (uuid: string) => ['storefront:orders', uuid] as const,
  wishlist: ['storefront:wishlist'] as const,
};
