'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import {
  PRODUCTS,
  CATEGORIES,
  BRANDS,
  POPULAR_SEARCHES,
} from '@/lib/storefront/mock-data';
import type { Product } from '@/types/storefront';

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
] as const;

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [query, setQuery] = useState(q);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('relevance');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [loading] = useState(false);

  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    id: string
  ) => setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const filtered = useMemo(() => {
    const lc = q.toLowerCase().trim();
    let list: Product[] = [];
    if (!lc) {
      list = [...PRODUCTS];
    } else {
      list = PRODUCTS.filter(
        p =>
          p.name.toLowerCase().includes(lc) ||
          p.shortDescription?.toLowerCase().includes(lc) ||
          p.variations.some(v => v.sku.toLowerCase().includes(lc)) ||
          p.brand?.name.toLowerCase().includes(lc) ||
          p.category.name.toLowerCase().includes(lc)
      );
    }
    if (selectedBrands.length > 0)
      list = list.filter(p => p.brand && selectedBrands.includes(p.brand.id));
    if (selectedCats.length > 0)
      list = list.filter(p => selectedCats.includes(p.category.id));
    const sortFns: Record<string, (a: Product, b: Product) => number> = {
      relevance: (a, b) => b.rating - a.rating,
      newest: (a, b) => Number(b.isNew) - Number(a.isNew),
      price_asc: (a, b) => a.variations[0].sellingPrice - b.variations[0].sellingPrice,
      price_desc: (a, b) => b.variations[0].sellingPrice - a.variations[0].sellingPrice,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(sortFns[sort]);
  }, [q, sort, selectedBrands, selectedCats]);

  const parentCats = CATEGORIES.filter(c => !c.parentId);

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <ScrollReveal animation="fade-up"  as="div" className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-8">
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

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 space-y-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Category</p>
                <ul className="space-y-2">
                  {parentCats.map(c => (
                    <li key={c.id}>
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="sf-check"
                          checked={selectedCats.includes(c.id)}
                          onChange={() => toggle(selectedCats, setSelectedCats, c.id)}
                        />
                        {c.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Brand</p>
                <ul className="max-h-60 space-y-2 overflow-auto scrollbar-thin">
                  {BRANDS.map(b => (
                    <li key={b.id}>
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="sf-check"
                          checked={selectedBrands.includes(b.id)}
                          onChange={() => toggle(selectedBrands, setSelectedBrands, b.id)}
                        />
                        {b.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <div>
            {/* Toolbar */}
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900 dark:text-gray-100">{filtered.length}</span> results
              </p>
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
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  No products found for &ldquo;{q}&rdquo;
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Try a different keyword or browse our catalog.
                </p>
                <Link
                  href="/store/products"
                  className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                >
                  Browse all products <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((p, i) => (
                  <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
                    <ProductCard product={p} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}