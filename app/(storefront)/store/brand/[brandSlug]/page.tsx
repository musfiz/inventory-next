'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useSeo } from '@/lib/utils/use-seo';
import { ChevronDown, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { BRANDS, PRODUCTS } from '@/lib/storefront/mock-data';
import { formatMoney } from '@/lib/utils/format';
import type { Product } from '@/types/storefront';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
] as const;

export default function BrandPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const brand = BRANDS.find(b => b.slug === brandSlug);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');

  useSeo({
    title: brand ? `${brand.name} | UIMS Store` : 'Brand | UIMS Store',
    description: brand
      ? `Shop ${brand.name} products at UIMS Store.`
      : 'Browse brands at UIMS Store.',
    url: `/store/brand/${brandSlug}`,
  });

  const filtered = useMemo(() => {
    if (!brand) return [];
    let list = PRODUCTS.filter(p => p.brand?.id === brand.id);
    const sortFns: Record<string, (a: Product, b: Product) => number> = {
      featured: (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
      newest: (a, b) => Number(b.isNew) - Number(a.isNew),
      price_asc: (a, b) => a.variations[0].sellingPrice - b.variations[0].sellingPrice,
      price_desc: (a, b) => b.variations[0].sellingPrice - a.variations[0].sellingPrice,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(sortFns[sort]);
  }, [brand, sort]);

  if (!brand) notFound();

  const minPrice = filtered.length > 0 ? Math.min(...filtered.map(p => p.variations[0].sellingPrice)) : 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <ScrollReveal animation="fade-up" duration="normal" as="div" className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <nav className="text-xs text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-brand-600">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/store/products" className="hover:text-brand-600">Brands</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-gray-100">{brand.name}</span>
          </nav>
          <div className="mt-5 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                {brand.name}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                {filtered.length} products · Prices from {formatMoney(minPrice)}
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Toolbar */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900 dark:text-gray-100">{filtered.length}</span> products
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
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              No products from {brand.name} yet
            </p>
            <Link href="/store/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
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

        {/* Other brands */}
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Other brands</h2>
          <div className="flex flex-wrap gap-2">
            {BRANDS.filter(b => b.id !== brand.id).map(b => (
              <Link
                key={b.id}
                href={`/brand/${b.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}