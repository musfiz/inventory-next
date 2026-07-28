'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, notFound } from 'next/navigation';
import { ChevronDown, SlidersHorizontal, X, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { CATEGORIES, PRODUCTS } from '@/lib/storefront/mock-data';
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
  const category = CATEGORIES.find(c => c.slug === categorySlug);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const childCats = category ? CATEGORIES.filter(c => c.parentId === category.id) : [];

  const allFiltered = useMemo(() => {
    if (!category) return [];
    const descendantIds = new Set<string>([category.id]);
    childCats.forEach(c => descendantIds.add(c.id));
    childCats.forEach(c =>
      CATEGORIES.filter(cc => cc.parentId === c.id).forEach(cc => descendantIds.add(cc.id))
    );
    let list = PRODUCTS.filter(p => descendantIds.has(p.category.id));
    if (inStockOnly) list = list.filter(p => p.variations.some(v => v.stock > 0));
    const sortFns: Record<string, (a: Product, b: Product) => number> = {
      featured: (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
      newest: (a, b) => Number(b.isNew) - Number(a.isNew),
      price_asc: (a, b) => a.variations[0].sellingPrice - b.variations[0].sellingPrice,
      price_desc: (a, b) => b.variations[0].sellingPrice - a.variations[0].sellingPrice,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(sortFns[sort]);
  }, [category, childCats, sort, inStockOnly]);

  const filtered = allFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < allFiltered.length;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = () => {
    if (hasMore) setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, allFiltered.length));
  };

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [sort, inStockOnly]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore]);

  if (!category) notFound();

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="relative h-44 overflow-hidden sm:h-60">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-6">
            <nav className="text-xs text-white/80">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-white">{category.name}</span>
            </nav>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {category.name}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {filtered.length} products available
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Subcategory chips */}
        {childCats.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {childCats.map(c => (
              <Link
                key={c.id}
                href={`/store/category/${c.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                {c.name}
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </Link>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 lg:hidden dark:border-gray-700 dark:text-gray-300"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </button>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900 dark:text-gray-100">{filtered.length}</span> products
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

        {/* Grid */}
        {filtered.length === 0 ? (
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
              {filtered.map((p, i) => (
                <ScrollReveal key={p.id} delayMs={i * 200}>
                  <ProductCard product={p} />
                </ScrollReveal>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center" ref={sentinelRef}>
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-all hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  Load more ({allFiltered.length - visibleCount} remaining)
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFilterOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5 sf-slide-in-left dark:bg-gray-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Filters</h2>
              <button onClick={() => setFilterOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" className="sf-check" checked={inStockOnly} onChange={() => setInStockOnly(v => !v)} />
              In stock only
            </label>
            <button
              onClick={() => setFilterOpen(false)}
              className="mt-6 w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white"
            >
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
