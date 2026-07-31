'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { FiGrid } from 'react-icons/fi';
import { IoListSharp } from 'react-icons/io5';
import ProductCard from '@/components/storefront/ProductCard';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import storefrontService from '@/services/storefrontService';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import type { Product, Brand } from '@/types/storefront';

const SORTS = [
  { id: 'featured', label: 'Featured', fn: (a: Product, b: Product) => Number(b.isFeatured) - Number(a.isFeatured) },
  { id: 'newest', label: 'Newest', fn: (a: Product, b: Product) => Number(b.isNew) - Number(a.isNew) },
  { id: 'price_asc', label: 'Price: Low to High', fn: (a: Product, b: Product) => a.variations[0].sellingPrice - b.variations[0].sellingPrice },
  { id: 'price_desc', label: 'Price: High to Low', fn: (a: Product, b: Product) => b.variations[0].sellingPrice - a.variations[0].sellingPrice },
  { id: 'rating', label: 'Top Rated', fn: (a: Product, b: Product) => b.rating - a.rating },
] as const;

const ITEMS_PER_PAGE = 8;

const PRICE_STEPS = [
  { id: 'all', label: 'All prices', min: 0, max: Infinity },
  { id: 'under-50', label: 'Under ৳50', min: 0, max: 50 },
  { id: '50-200', label: '৳50 – ৳200', min: 50, max: 200 },
  { id: '200-1000', label: '৳200 – ৳1,000', min: 200, max: 1000 },
  { id: 'over-1000', label: 'Over ৳1,000', min: 1000, max: Infinity },
];

export default function AllProductsPage() {
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceStep, setPriceStep] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);

  const { categories: parentCats } = useStorefrontCategories();

  useEffect(() => {
    let cancelled = false;

    const loadFirstPage = async () => {
      setLoading(true);
      try {
        const res = await storefrontService.getProducts({ page: 1, per_page: ITEMS_PER_PAGE, sort: 'featured' });
        if (cancelled) return;
        setProducts(res.data);
        setPage(1);
        setTotalProducts(res.meta.total);
        setHasMorePages(res.meta.current_page < res.meta.last_page);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!hasMorePages || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await storefrontService.getProducts({ page: nextPage, per_page: ITEMS_PER_PAGE, sort: 'featured' });
      setProducts(prev => prev.concat(res.data));
      setPage(nextPage);
      setTotalProducts(res.meta.total);
      setHasMorePages(res.meta.current_page < res.meta.last_page);
    } finally {
      setLoadingMore(false);
    }
  };

  const brands = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const p of products) {
      if (p.brand && !map.has(p.brand.id)) map.set(p.brand.id, { ...p.brand, productCount: 0 });
    }
    for (const p of products) {
      if (p.brand) {
        const b = map.get(p.brand.id)!;
        b.productCount = (b.productCount ?? 0) + 1;
      }
    }
    return Array.from(map.values());
  }, [products]);

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

  const allFiltered = useMemo(() => {
    const step = PRICE_STEPS.find(s => s.id === priceStep)!;
    let list = products.filter(p => {
      if (selectedCats.length > 0) {
        const match =
          selectedCats.includes(p.category.id) ||
          selectedCats.some(cid => childrenOf[cid]?.has(p.category.id));
        if (!match) return false;
      }
      if (selectedBrands.length > 0 && (!p.brand || !selectedBrands.includes(p.brand.id))) return false;
      const price = p.variations[0].sellingPrice;
      if (price < step.min || price > step.max) return false;
      if (inStockOnly && !p.variations.some(v => v.stock > 0)) return false;
      return true;
    });
    const sortCfg = SORTS.find(s => s.id === sort)!;
    list = [...list].sort(sortCfg.fn);
    return list;
  }, [sort, selectedCats, selectedBrands, priceStep, inStockOnly, childrenOf, products]);

  const filtered = allFiltered;

  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    id: string
  ) => setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const clearAll = () => {
    setSelectedCats([]);
    setSelectedBrands([]);
    setPriceStep('all');
    setInStockOnly(false);
  };

  const activeFilterCount =
    selectedCats.length +
    selectedBrands.length +
    (priceStep !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Category
        </p>
        <ul className="space-y-2">
          {parentCats.map(c => {
            const childCats = c.children ?? [];
            return (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="sf-check"
                    checked={selectedCats.includes(c.id)}
                    onChange={() => toggle(selectedCats, setSelectedCats, c.id)}
                  />
                  {c.name}
                  <span className="text-xs text-gray-400">
                    ({c.productCount ?? 0})
                  </span>
                </label>
                {childCats.length > 0 && selectedCats.includes(c.id) && (
                  <ul className="ml-6 mt-2 space-y-2">
                    {childCats.map(cc => (
                      <li key={cc.id}>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            className="sf-check"
                            checked={selectedCats.includes(cc.id)}
                            onChange={() =>
                              toggle(selectedCats, setSelectedCats, cc.id)
                            }
                          />
                          {cc.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Price
        </p>
        <ul className="space-y-2">
          {PRICE_STEPS.map(s => (
            <li key={s.id}>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="price"
                  className="sf-check"
                  checked={priceStep === s.id}
                  onChange={() => setPriceStep(s.id)}
                />
                {s.label}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Brand
        </p>
        <ul className="max-h-60 space-y-2 overflow-auto scrollbar-thin">
          {brands.map(b => (
            <li key={b.id}>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="sf-check"
                  checked={selectedBrands.includes(b.id)}
                  onChange={() => toggle(selectedBrands, setSelectedBrands, b.id)}
                />
                {b.name}
                <span className="text-xs text-gray-400">({b.productCount ?? 0})</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Availability
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="sf-check"
            checked={inStockOnly}
            onChange={() => setInStockOnly(v => !v)}
          />
          In stock only
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

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
          <div className="mx-auto w-full max-w-7xl px-4 pb-6">
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

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <ScrollReveal animation="slide-right" duration="normal" as="div" className="sticky top-32 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </h2>
              <FilterContent />
            </ScrollReveal>
          </aside>

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
                    <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
                      <ProductCard product={p} variant={view === 'list' ? 'list' : 'default'} />
                    </ScrollReveal>
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
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFilterOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5 sf-slide-in-left dark:bg-gray-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterContent />
            <button
              onClick={() => setFilterOpen(false)}
              className="mt-6 w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}