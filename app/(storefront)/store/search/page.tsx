'use client';

import { Search, X, ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import { FilterSidebar, FilterDrawer, PRICE_STEPS } from '@/components/storefront/ProductFilterSidebar';
import ProductVariationCards from '@/components/storefront/ProductVariationCards';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { useStorefrontBrands } from '@/hooks/use-storefront-brands';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { useInfinitePages } from '@/hooks/use-storefront-data';
import { POPULAR_SEARCHES } from '@/lib/storefront/mock-data';
import { useSeo } from '@/lib/utils/use-seo';
import storefrontService from '@/services/storefrontService';

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
] as const;

const ITEMS_PER_PAGE = 12;

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [query, setQuery] = useState(q);
  const { storeName } = useStorefrontStatus();
  const siteName = storeName || 'Our Store';

  useSeo({
    title: q ? `Search: ${q} | ${siteName}` : `Search | ${siteName}`,
    description: q
      ? `Search results for "${q}" at ${siteName}.`
      : `Search products at ${siteName}.`,
    url: `/store/search?q=${encodeURIComponent(q)}`,
  });
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [priceStep, setPriceStep] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);

  const { categories: parentCats } = useStorefrontCategories();
  const { brands } = useStorefrontBrands();

  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    id: string
  ) => setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const clearAll = () => {
    setSelectedBrands([]);
    setSelectedCats([]);
    setPriceStep('all');
    setMinRating(0);
    setInStockOnly(false);
  };

  const activeFilterCount =
    selectedBrands.length +
    selectedCats.length +
    (priceStep !== 'all' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const priceRange = PRICE_STEPS.find(s => s.id === priceStep) ?? PRICE_STEPS[0];

  const filterProps = {
    categories: parentCats,
    selectedCategoryIds: selectedCats,
    onToggleCategory: (id: string) => toggle(selectedCats, setSelectedCats, id),
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

  // Server-driven search + filters via SWR — one cache entry per (query/filters, page).
  const filterKey = {
    q,
    sort,
    cats: selectedCats.join(','),
    brands: selectedBrands.join(','),
    priceStep,
    minRating,
    inStockOnly,
  };

  const grid = useInfinitePages(
    'storefront:search',
    filterKey,
    (pageNum) => storefrontService.search({
      q,
      page: pageNum,
      per_page: ITEMS_PER_PAGE,
      sort,
      category_id: selectedCats.length > 0 ? selectedCats.join(',') : undefined,
      brand_id: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
      min_price: priceRange.min > 0 ? priceRange.min : undefined,
      max_price: Number.isFinite(priceRange.max) ? priceRange.max : undefined,
      in_stock: inStockOnly || undefined,
      min_rating: minRating > 0 ? minRating : undefined,
    }),
    !!q.trim(),
  );

  const results = grid.pages.flatMap(p => p.data);
  const meta = { current_page: grid.meta?.current_page ?? 1, last_page: grid.meta?.last_page ?? 1, total: grid.meta?.total ?? 0 };
  const loading = grid.loading && !!q.trim();
  const hasMore = grid.hasMore;
  const loadingMore = grid.loadingMore;
  const loadMore = grid.loadMore;

  const displayed = results;

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <ScrollReveal animation="fade-up"  as="div" className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-screen-2xl px-4 py-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            {q ? (
              <>
                Results for &ldquo;<span className="text-brand-600">{q}</span>&rdquo;
              </>
            ) : (
              'Search products'
            )}
          </h1>

          {/* Search input (echo) */}
          <form
            onSubmit={() => {}}
            className="mt-4 flex max-w-xl items-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950"
          >
            <Search className="ml-4 h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for products..."
              className="flex-1 bg-transparent px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Link
              href={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}
              className="m-1 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              Search
            </Link>
          </form>

          {!q && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Popular searches
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map(s => (
                  <Link
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-100 hover:text-brand-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar */}
          <FilterSidebar {...filterProps} />

          <div>
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
                  <span className="font-bold text-gray-900 dark:text-gray-100">{displayed.length}</span> of {meta.total} results
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
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {q ? `No products found for “${q}”` : 'Start typing to search our catalog'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {q ? 'Try a different keyword or browse our catalog.' : 'Popular searches are listed above.'}
                </p>
                <Link
                  href="/store/products"
                  className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                >
                  Browse all products <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {displayed.map((p, i) => (
                    <ProductVariationCards key={p.id} product={p} staggerIndex={i} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {loadingMore ? 'Loading…' : `Load more (${meta.total - displayed.length} remaining)`}
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
        resultCount={displayed.length}
      />
    </div>
  );
}