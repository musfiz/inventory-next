'use client';

import {
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { FiGrid } from 'react-icons/fi';
import { IoListSharp } from 'react-icons/io5';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import { FilterSidebar, FilterDrawer, PRICE_STEPS } from '@/components/storefront/ProductFilterSidebar';
import ProductVariationCards from '@/components/storefront/ProductVariationCards';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { useStorefrontBrands } from '@/hooks/use-storefront-brands';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
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

const apiSortParam = (s: string) => (['featured', 'newest'].includes(s) ? s : 'featured');

const sortClientSide = (data: Product[], s: string) => {
  if (s === 'price_asc') return [...data].sort((a, b) => (a.variations[0]?.sellingPrice ?? 0) - (b.variations[0]?.sellingPrice ?? 0));
  if (s === 'price_desc') return [...data].sort((a, b) => (b.variations[0]?.sellingPrice ?? 0) - (a.variations[0]?.sellingPrice ?? 0));
  if (s === 'rating') return [...data].sort((a, b) => b.rating - a.rating);
  return data;
};

export default function AllProductsPage() {
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceStep, setPriceStep] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);

  const { categories: parentCats } = useStorefrontCategories();
  const { brands } = useStorefrontBrands();

  // Build: for each parent category ID, collect all descendant (child) category IDs
  const childrenOf = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const collect = (items: import('@/services/storefrontService').CategoryTreeItem[]) => {
      for (const item of items) {
        const ids = new Set<string>();
        const gather = (children: import('@/services/storefrontService').CategoryTreeItem[]) => {
          for (const child of children) {
            ids.add(child.id);
            if (child.children?.length) gather(child.children);
          }
        };
        if (item.children?.length) gather(item.children);
        map[item.id] = ids;
      }
    };
    collect(parentCats);
    return map;
  }, [parentCats]);

  // Expand any selected parent category into itself + all its descendant IDs
  const categoryIdsForApi = useMemo(() => {
    if (selectedCats.length === 0) return undefined;
    const ids = new Set<string>();
    for (const id of selectedCats) {
      ids.add(id);
      childrenOf[id]?.forEach(cid => ids.add(cid));
    }
    return Array.from(ids).join(',');
  }, [selectedCats, childrenOf]);

  const priceRange = PRICE_STEPS.find(s => s.id === priceStep) ?? PRICE_STEPS[0];

  const fetchProducts = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await storefrontService.getProducts({
        page: pageNum,
        per_page: ITEMS_PER_PAGE,
        sort: apiSortParam(sort),
        category_id: categoryIdsForApi,
        brand_id: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
        min_price: priceRange.min > 0 ? priceRange.min : undefined,
        max_price: Number.isFinite(priceRange.max) ? priceRange.max : undefined,
        in_stock: inStockOnly || undefined,
        min_rating: minRating > 0 ? minRating : undefined,
      });
      const sorted = sortClientSide(res.data, sort);
      setProducts(prev => (append ? prev.concat(sorted) : sorted));
      setPage(pageNum);
      setTotalProducts(res.meta.total);
      setHasMorePages(res.meta.current_page < res.meta.last_page);
    } catch {
      if (!append) setProducts([]);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, categoryIdsForApi, selectedBrands, priceStep, minRating, inStockOnly]);

  const loadMore = () => {
    if (!hasMorePages || loadingMore) return;
    fetchProducts(page + 1, true);
  };

  // Flatten all category tree items into a single array for quick lookup
  const allCategories = useMemo(() => {
    const flat: import('@/services/storefrontService').CategoryTreeItem[] = [];
    const walk = (items: import('@/services/storefrontService').CategoryTreeItem[]) => {
      for (const item of items) {
        flat.push(item);
        if (item.children?.length) walk(item.children);
      }
    };
    walk(parentCats);
    return flat;
  }, [parentCats]);

  const filtered = products;

  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    id: string
  ) => setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const clearAll = () => {
    setSelectedCats([]);
    setSelectedBrands([]);
    setPriceStep('all');
    setMinRating(0);
    setInStockOnly(false);
  };

  const activeFilterCount =
    selectedCats.length +
    selectedBrands.length +
    (priceStep !== 'all' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

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

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <ScrollReveal animation="fade-up" duration="normal" as="div" className="relative h-44 overflow-hidden sm:h-60">
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
              All Products
            </span>
          </div>
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-screen-2xl px-4 pb-6">
            <nav className="text-xs text-white/80">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-white">All Products</span>
            </nav>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              All Products
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Browse our complete catalog of {totalProducts} products
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar (desktop) */}
          <FilterSidebar {...filterProps} />

          {/* Main */}
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
                  Showing <span className="font-bold text-gray-900 dark:text-gray-100">{filtered.length}</span> of {totalProducts} products
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center rounded-lg border border-gray-200 p-0.5 dark:border-gray-700 sm:flex">
                  <button
                    onClick={() => setView('grid')}
                    aria-label="Grid view"
                    className={`rounded-md p-1.5 transition-colors ${view === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                  >
                    <FiGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    aria-label="List view"
                    className={`rounded-md p-1.5 transition-colors ${view === 'list' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                  >
                    <IoListSharp className="h-4 w-4" />
                  </button>
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
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedCats.map(id => {
                  const c = allCategories.find(cc => cc.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(selectedCats, setSelectedCats, id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                    >
                      {c?.name}
                      <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {selectedBrands.map(id => {
                  const b = brands.find(bb => bb.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(selectedBrands, setSelectedBrands, id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                    >
                      {b?.name}
                      <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {priceStep !== 'all' && (
                  <button
                    onClick={() => setPriceStep('all')}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    {PRICE_STEPS.find(s => s.id === priceStep)?.label}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {minRating > 0 && (
                  <button
                    onClick={() => setMinRating(0)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    {minRating}★ & up
                    <X className="h-3 w-3" />
                  </button>
                )}
                {inStockOnly && (
                  <button
                    onClick={() => setInStockOnly(false)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    In stock only
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className={`grid gap-3 sm:grid-cols-3 ${view === 'list' ? 'grid-cols-1' : 'lg:grid-cols-4 xl:grid-cols-5'}`}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <ProductCardSkeleton key={i} compact={view === 'list'} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  No products match your filters
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Try removing some filters to see more results.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${view === 'list' ? '!grid-cols-1' : ''}`}>
                  {filtered.map((p, i) => (
                    <ProductVariationCards key={p.id} product={p} variant={view === 'list' ? 'list' : 'default'} staggerIndex={i} />
                  ))}
                </div>
                {hasMorePages && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {loadingMore ? 'Loading…' : `Load more (${totalProducts - products.length} remaining)`}
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
        resultCount={filtered.length}
      />
    </div>
  );
}