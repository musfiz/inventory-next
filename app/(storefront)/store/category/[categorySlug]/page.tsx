'use client';

import { ChevronDown, ArrowRight, SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useState } from 'react';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import { FilterSidebar, FilterDrawer, PRICE_STEPS } from '@/components/storefront/ProductFilterSidebar';
import ProductVariationCards from '@/components/storefront/ProductVariationCards';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { useStorefrontBrands, useCategoryBySlug, useInfinitePages } from '@/hooks/use-storefront-data';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { useSeo } from '@/lib/utils/use-seo';
import storefrontService from '@/services/storefrontService';
import type { Product } from '@/types/storefront';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
] as const;

const ITEMS_PER_PAGE = 8;

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceStep, setPriceStep] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const { brands } = useStorefrontBrands();
  const { storeName } = useStorefrontStatus();
  const siteName = storeName || 'Our Store';

  // Category header — SWR; 404 error is terminal (no retry).
  const { category, is404, loading: categoryLoading } = useCategoryBySlug(categorySlug);

  useSeo({
    title: category ? `${category.name} | ${siteName}` : `Category | ${siteName}`,
    description:
      category?.description ||
      `Browse products in the ${category?.name || 'category'} category at ${siteName}.`,
    url: `/store/category/${categorySlug}`,
  });

  // Helpers — image URL resolver
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
    if (!baseUrl) return url;
    return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  const apiSortParam = (s: string) => (['featured', 'newest'].includes(s) ? s : 'featured');
  const sortClientSide = (data: Product[], s: string) => {
    if (s === 'price_asc') {
      return [...data].sort((a, b) => (a.variations[0]?.sellingPrice ?? 0) - (b.variations[0]?.sellingPrice ?? 0));
    }
    if (s === 'price_desc') {
      return [...data].sort((a, b) => (b.variations[0]?.sellingPrice ?? 0) - (a.variations[0]?.sellingPrice ?? 0));
    }
    if (s === 'rating') {
      return [...data].sort((a, b) => b.rating - a.rating);
    }
    return data;
  };

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const clearAll = () => {
    setSelectedBrands([]);
    setPriceStep('all');
    setMinRating(0);
    setInStockOnly(false);
  };

  const activeFilterCount =
    selectedBrands.length +
    (priceStep !== 'all' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const priceRange = PRICE_STEPS.find(s => s.id === priceStep) ?? PRICE_STEPS[0];

  const filterProps = {
    brands,
    selectedBrandIds: selectedBrands,
    onToggleBrand: (id: string) => toggle(selectedBrands, setSelectedBrands, id),
    priceStep,
    onPriceStepChange: setPriceStep,
    minRating,
    onMinRatingChange: setMinRating,
    inStockOnly,
    onInStockChange: setInStockOnly,
    activeFilterCount,
    onClearAll: clearAll,
  };

  // Products — one SWR entry per (filters, page); filter/sort change resets to page 1,
  // keepPreviousData avoids the flash while page 1 reloads.
  const filterKey = {
    categoryId: category?.id ?? null,
    sort,
    brands: selectedBrands.join(','),
    priceStep,
    minRating,
    inStockOnly,
  };

  const fetchPage = async (pageNum: number) => {
    const res = await storefrontService.getProducts({
      category_id: Number(category!.id),
      sort: apiSortParam(sort),
      page: pageNum,
      per_page: ITEMS_PER_PAGE,
      brand_id: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
      min_price: priceRange.min > 0 ? priceRange.min : undefined,
      max_price: Number.isFinite(priceRange.max) ? priceRange.max : undefined,
      in_stock: inStockOnly || undefined,
      min_rating: minRating > 0 ? minRating : undefined,
    });
    return { ...res, data: sortClientSide(res.data, sort) };
  };

  const grid = useInfinitePages(
    'storefront:category-products',
    filterKey,
    fetchPage,
    !!category?.id,
  );
  const products = grid.pages.flatMap(p => p.data);
  const meta = { current_page: grid.meta?.current_page ?? 1, last_page: grid.meta?.last_page ?? 1, total: grid.meta?.total ?? 0 };

  // 404 handling
  if (is404) notFound();
  if (!categoryLoading && !category && !is404) notFound();

  // Loading skeleton
  if (categoryLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="relative h-44 animate-pulse overflow-hidden bg-gray-200 sm:h-60 dark:bg-gray-800" />
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
          <div className="mb-5 h-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <ScrollReveal animation="fade-up" duration="normal" as="div" className="relative h-44 overflow-hidden sm:h-60">
        {/* Default gradient design — always rendered as base layer */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-brand-600 via-brand-700 to-purple-800" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[40px] border-white/5" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div
            className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
            aria-hidden="true"
          >
            <span className="whitespace-nowrap text-[10rem] font-black leading-none tracking-widest text-white/5 sm:text-[16rem]">
              {category!.name}
            </span>
          </div>
        </div>
        {/* Banner image — layered on top; hidden if missing or broken */}
        {category?.banner_image && !bannerError ? (
          <Image
            src={resolveImageUrl(category.banner_image)}
            alt={category!.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            onError={() => setBannerError(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-screen-2xl px-4 pb-6">
            <nav className="text-xs text-white/80">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-white">{category!.name}</span>
            </nav>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {category!.name}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {meta.total} product{meta.total !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar (desktop) */}
          <FilterSidebar {...filterProps} />

          <div>
        {/* Subcategory chips */}
        {category!.children.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {category!.children.map((c, i) => (
              <ScrollReveal key={c.id} animation="pop" staggerIndex={i} staggerGap={60}>
                <Link
                  href={`/store/category/${c.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  {c.name}
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 lg:hidden dark:border-gray-700 dark:text-gray-300"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900 dark:text-gray-100">{products.length}</span> product{products.length !== 1 ? 's' : ''}
              {meta.total > products.length && <span className="text-gray-400"> · {meta.total} total</span>}
            </p>
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {SORTS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Grid — loading state */}
        {grid.loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : /* Empty state */
          products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                No products in this category yet
              </p>
              <Link
                href="/store/products"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600"
              >
                Browse all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((p, i) => (
                  <ProductVariationCards key={p.id} product={p} staggerIndex={i} />
                ))}
              </div>
              {grid.hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={grid.loadMore}
                    disabled={grid.loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {grid.loadingMore ? 'Loading…' : `Load more (${meta.total - products.length} remaining)`}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <FilterDrawer
        {...filterProps}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        resultCount={products.length}
      />
    </div>
  );
}
