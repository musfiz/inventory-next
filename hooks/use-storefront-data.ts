'use client';

/**
 * SWR data hooks for the storefront.
 *
 * Conventions:
 * - Every key comes from lib/storefront/keys.ts (SK) so all consumers of an
 *   endpoint share one cache entry.
 * - Fetchers return UNWRAPPED domain data (services already unwrap the
 *   { success, data } envelope); hooks expose the same data/error shapes pages
 *   need so pages never touch axios.
 * - `ready === false` components pass `null` keys (SWR skips the request);
 *   keep that behavior to avoid firing requests before auth/tenant resolution.
 */
import { useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import useSWRInfinite from 'swr/infinite';
import apiClient from '@/lib/api/axios';
import storefrontService, {
  type CategoryTreeItem,
  type CategoryPageData,
  type ProductsResponse,
  type StorefrontHeroSlider,
  type StorefrontFlashSaleCampaign,
} from '@/services/storefrontService';
import type { StorefrontOfferSlide, Product, Brand, Address } from '@/types/storefront';
import checkoutService, { type StorefrontOrder } from '@/services/checkoutService';
import headerMenuService from '@/services/headerMenuService';
import footerService from '@/services/footerService';
import type { FooterConfig } from '@/types/api.types';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import type { EcommerceOrder, OrderDetail } from '@/types/ecommerce';
import type { HeaderMenuConfig } from '@/types/api.types';
import type { BrandingResponse } from '@/types/api.types';
import { SK } from '@/lib/storefront/keys';

// ─── Global storefront state (header/footer/layout) ────────────────────────
// useStorefrontStatus / useStorefrontSettings live in use-storefront-status.ts
// (canonical, shared with the admin settings page) — re-exported here for a
// single import surface.
export { useStorefrontStatus, useStorefrontSettings } from '@/hooks/use-storefront-status';
export type { StorefrontSettings } from '@/hooks/use-storefront-status';

export interface Branding {
  headerLogo: string | null;
  footerLogo: string | null;
  favicon: string | null;
}

const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}${url.startsWith('/') ? url : '/' + url}` : url;
};

export function useBranding(enabled = true) {
  const { data, isLoading } = useSWR<Branding>(
    enabled ? SK.branding : null,
    async () => {
      const res = await apiClient.get<{ data: BrandingResponse }>('/api/v1/storefront/branding');
      const d = res.data?.data;
      return {
        headerLogo: resolveImageUrl(d?.header_logo_url),
        footerLogo: resolveImageUrl(d?.footer_logo_url),
        favicon: resolveImageUrl(d?.favicon_url),
      };
    },
  );
  return {
    headerLogo: data?.headerLogo ?? null,
    footerLogo: data?.footerLogo ?? null,
    favicon: data?.favicon ?? null,
    loading: isLoading,
    ready: !isLoading,
  };
}

const DEFAULT_HEADER_MENU: HeaderMenuConfig = {
  utility_bar_enabled: true,
  utility_bar_text_free_shipping: 'Free shipping over ৳5,000',
  utility_bar_text_discount: '10% off your first order',
  utility_bar_phone: '+880 1700-000000',
  utility_bar_bg_color: '#7c3aed',
  utility_bar_text_color: '#ffffff',
  nav_links: [],
  navigation_show_flash_sale: true,
  navigation_show_new_arrivals: true,
  menu_items: [],
  show_search_bar: true,
  show_wishlist_icon: true,
  show_account_icon: true,
  show_cart_icon: true,
  sticky_header: true,
  mega_menu_config: null,
};

export function useHeaderMenu() {
  const { data, isLoading } = useSWR<HeaderMenuConfig>(
    SK.headerMenu,
    () => headerMenuService.getStorefront(),
  );
  // Consumers read `config.mega_menu_config` etc. directly — never hand them null.
  return { config: data ?? DEFAULT_HEADER_MENU, loading: isLoading, ready: !isLoading };
}

export function useStorefrontCategories(enabled = true) {
  const { data, isLoading } = useSWR<CategoryTreeItem[]>(
    enabled ? SK.categories : null,
    () => storefrontService.getCategories(),
  );
  return { categories: data ?? [], loading: isLoading, ready: !isLoading };
}

/** Footer builder config — shared cache so both footers fetch once. */
export function useFooterConfig() {
  const { data, error, isLoading } = useSWR<FooterConfig>(
    SK.footerConfig,
    () => footerService.get(),
    { shouldRetryOnError: false },
  );
  return { config: data ?? null, error, loading: isLoading };
}

/** Total catalog product count (cheap per_page=1 read) — for footer stats. */
export function useProductCount() {
  const { data } = useSWR<number>(
    SK.productCount,
    async () => (await storefrontService.getProducts({ per_page: 1 }))?.meta?.total ?? 0,
    { shouldRetryOnError: false },
  );
  return data ?? 0;
}

export function useStorefrontBrands(enabled = true) {
  const { data, isLoading } = useSWR<Brand[]>(
    enabled ? SK.brands : null,
    async () => (await storefrontService.getBrands({ per_page: 100 })).data,
  );
  return { brands: data ?? [], loading: isLoading, ready: !isLoading };
}

export function useTrendingSearches(enabled = true) {
  const { data, isLoading } = useSWR<string[]>(
    enabled ? SK.trending : null,
    () => storefrontService.getTrendingSearches(8),
  );
  return { terms: data ?? [], loading: isLoading, ready: !isLoading };
}

// ─── Catalog pages ──────────────────────────────────────────────────────────

/** Category header (banner/children). Throws axios error through for 404 handling. */
export function useCategoryBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR<CategoryPageData>(
    slug ? SK.categoryBySlug(slug) : null,
    () => storefrontService.getCategoryBySlug(slug!),
    { shouldRetryOnError: false },
  );
  return { category: data ?? null, error, is404: error?.response?.status === 404, loading: isLoading };
}

/**
 * Generic "Load more" pagination. One cache entry per (namespace, filterKey, page);
 * changing filterKey resets to page 1 automatically and keepPreviousData (global)
 * keeps the old grid visible while page 1 refetches.
 */
export function useInfinitePages<T extends { meta: { current_page: number; last_page: number; total: number } }>(
  namespace: string,
  filterKey: unknown,
  fetchPage: (page: number) => Promise<T>,
  enabled = true,
) {
  const swr = useSWRInfinite<T>(
    index => (enabled ? [namespace, filterKey, index + 1] : null),
    (key: [string, unknown, number]) => fetchPage(key[2]),
    { revalidateFirstPage: false },
  );
  // Filter/sort changes must drop accumulated pages back to page 1.
  useEffect(() => { swr.setSize(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify([namespace, filterKey, enabled])]);
  const pages = swr.data ?? [];
  const lastMeta = pages[pages.length - 1]?.meta;
  return {
    pages,
    meta: lastMeta,
    total: lastMeta?.total ?? 0,
    hasMore: lastMeta ? pages.length < lastMeta.last_page : false,
    loading: swr.isLoading,
    loadingMore: swr.isValidating && !swr.isLoading,
    loadMore: () => swr.setSize(swr.size + 1),
    error: swr.error,
  };
}

export function useProductBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR<Product>(
    slug ? SK.productBySlug(slug) : null,
    () => storefrontService.getProductBySlug(slug!),
    { shouldRetryOnError: false },
  );
  return { product: data ?? null, error, is404: error?.response?.status === 404, loading: isLoading };
}

export function useRelatedProducts(categoryId: string | number | undefined, excludeProductId: string | undefined) {
  const { data } = useSWR<ProductsResponse>(
    categoryId && excludeProductId ? SK.related(categoryId, excludeProductId) : null,
    () => storefrontService.getProducts({ category_id: categoryId!, per_page: 6 }),
  );
  const related = (data?.data ?? []).filter(p => p.id !== excludeProductId).slice(0, 5);
  return { related, ready: !!data };
}

export function useProductReviews(slug: string | undefined, page = 1, perPage = 10) {
  const { data, isLoading, mutate } = useSWR(
    slug ? SK.reviews(slug, page) : null,
    () => storefrontService.getProductReviews(slug!, { page, per_page: perPage }),
  );
  return {
    reviews: data?.items ?? [],
    summary: data?.summary ?? { average: 0, total: 0, distribution: {} },
    loading: isLoading,
    mutate,
  };
}

export function useProductList(params: Parameters<typeof storefrontService.getProducts>[0], enabled = true) {
  const { data, isLoading } = useSWR<ProductsResponse>(
    enabled ? SK.products(params as Record<string, unknown>) : null,
    () => storefrontService.getProducts(params),
  );
  return { products: data?.data ?? [], total: data?.meta?.total ?? 0, loading: isLoading };
}

export function useFlashSale() {
  const { data, isLoading, error } = useSWR<StorefrontFlashSaleCampaign[]>(
    SK.flashSale,
    () => storefrontService.getFlashSale(),
    { shouldRetryOnError: false },
  );
  return { campaigns: data ?? [], loading: isLoading, error };
}

/** show_similar_products flag (ecommerce settings) — used by the product detail page. */
export function useShowSimilarProducts() {
  const { data } = useSWR<boolean>(
    ['storefront:ecommerce-settings', 'show_similar_products'],
    async () => (await ecommerceSettingsService.get()).show_similar_products,
  );
  return data ?? true;
}

export function useHeroSliders() {
  const { data, isLoading } = useSWR<StorefrontHeroSlider[]>(SK.heroSliders, () => storefrontService.getHeroSliders());
  return { sliders: data ?? [], loading: isLoading };
}

export function useOfferSlides() {
  const { data, isLoading } = useSWR<StorefrontOfferSlide[]>(SK.offerSlides, () => storefrontService.getOfferSlides());
  return { slides: data ?? [], loading: isLoading };
}

// ─── Account / checkout ─────────────────────────────────────────────────────

export function useSavedAddresses(enabled = true) {
  const { data, isLoading, mutate } = useSWR<Address[]>(
    enabled ? SK.addresses : null,
    () => checkoutService.getAddresses(),
  );
  return { addresses: data ?? [], loading: isLoading, mutate };
}

export function useOrders(enabled = true) {
  const { data, isLoading } = useSWR<any[]>(
    enabled ? SK.orders : null,
    () => checkoutService.listOrders(),
  );
  return { orders: data ?? [], loading: isLoading };
}

export function useOrderDetail(uuid: string | undefined, enabled = true) {
  const { data, error, isLoading } = useSWR(
    uuid && enabled ? SK.orderDetail(uuid) : null,
    () => checkoutService.getOrderDetail(uuid!),
    { shouldRetryOnError: false },
  );
  return { order: data ?? null, error, is404: error?.response?.status === 404, loading: isLoading };
}

export function useOrder(uuid: string | undefined) {
  const { data, error, isLoading } = useSWR<StorefrontOrder>(
    uuid ? SK.order(uuid) : null,
    () => checkoutService.getOrder(uuid!),
    { shouldRetryOnError: false },
  );
  return { order: data ?? null, error, is404: error?.response?.status === 404, loading: isLoading };
}

/** Track-orders list (ecommerce order API) — filtered client-side by status/tracking. */
export function useTrackableOrders(enabled = true) {
  const { data, error, isLoading } = useSWR<EcommerceOrder[]>(
    enabled ? ['storefront:trackable-orders'] : null,
    async () => {
      const result = await ecommerceOrderService.list({ per_page: 50 });
      return result.data.filter(
        o => ['shipped', 'delivered', 'packed', 'confirmed'].includes(o.status) || !!o.tracking_number,
      );
    },
    { shouldRetryOnError: false },
  );
  return { orders: data ?? [], error, loading: isLoading };
}

/** Single tracked order detail (ecommerce order API). */
export function useTrackedOrder(id: string | undefined) {
  const { data, error, isLoading } = useSWR<OrderDetail | null>(
    id ? ['storefront:tracked-order', id] : null,
    async () => (await ecommerceOrderService.getById(id!)) ?? null,
    { shouldRetryOnError: false },
  );
  return { order: data ?? null, error, loading: isLoading };
}

export function useWishlistIds(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR<string[]>(
    enabled ? SK.wishlist : null,
    async () => (await storefrontService.getWishlist()).items.map(i => i.product_id),
  );
  return { ids: data ?? null, loading: isLoading, mutate };
}

// ─── Search suggestions (debounced, keyed by query) ────────────────────────

export function useSearchSuggestions(q: string, enabled: boolean) {
  const { data, isLoading, isValidating } = useSWR(
    enabled && q.trim() ? ['storefront:search-suggest', q.trim()] : null,
    (key: [string, string]) => storefrontService.searchSuggest(key[1], { limit: 6 }),
    { keepPreviousData: true },
  );
  // isLoading is only true for the very first query (keepPreviousData);
  // isValidating covers every in-flight request.
  return { suggestions: data ?? null, loading: isLoading || isValidating };
}

// ─── Mutation helpers ───────────────────────────────────────────────────────

/** Re-fetch a storefront key family (prefix match) after a mutation. */
export function useStorefrontRevalidate() {
  const { mutate } = useSWRConfig();
  return (prefix: string) => mutate(k => Array.isArray(k) && k[0] === prefix, undefined, { revalidate: true });
}

export type { CategoryTreeItem, ProductsResponse };
