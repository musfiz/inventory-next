'use client';

import { ChevronDown, ArrowRight, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProductVariationCards from '@/components/storefront/ProductVariationCards';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { notify } from '@/lib/notifications';
import { formatMoney } from '@/lib/utils/format';
import { useSeo } from '@/lib/utils/use-seo';
import storefrontService from '@/services/storefrontService';
import type { Brand, Product } from '@/types/storefront';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
] as const;

export default function BrandPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const { storeName } = useStorefrontStatus();
  const siteName = storeName || 'Our Store';
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ last_page: number; total: number }>({
    last_page: 1,
    total: 0,
  });

  useSeo({
    title: brand ? `${brand.name} | ${siteName}` : `Brand | ${siteName}`,
    description: brand
      ? `Shop ${brand.name} products at ${siteName}. ${brand.description ?? ''}`.trim()
      : `Browse brands at ${siteName}.`,
    url: `/store/brand/${brandSlug}`,
  });

  useEffect(() => {
    storefrontService
      .getBrands({ per_page: 50 })
      .then(res => setAllBrands(res.data))
      .catch(() => setAllBrands([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    storefrontService
      .getBrand(brandSlug, { sort, page, per_page: 12 })
      .then(res => {
        if (!active) return;
        setBrand(res.brand);
        setMeta({ last_page: res.meta.last_page, total: res.meta.total });
        setProducts(prev => (page === 1 ? res.products : [...prev, ...res.products]));
      })
      .catch((err: any) => {
        if (!active) return;
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          notify.error('Failed to load brand');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [brandSlug, sort, page]);

  const onSortChange = (value: string) => {
    setPage(1);
    setProducts([]);
    setSort(value as (typeof SORTS)[number]['id']);
  };

  const loadMore = () => setPage(p => p + 1);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
          Brand not found
        </p>
        <Link
          href="/store/products"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600"
        >
          Browse all products <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const minPrice =
    products.length > 0
      ? Math.min(...products.map(p => p.variations[0]?.sellingPrice ?? 0))
      : 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <ScrollReveal
        animation="fade-up"
        duration="normal"
        as="div"
        className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mx-auto max-w-screen-2xl px-4 py-10">
          <nav className="text-xs text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-brand-600">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/store/products" className="hover:text-brand-600">
              Brands
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-gray-100">
              {brand?.name ?? '…'}
            </span>
          </nav>
          <div className="mt-5 flex items-center gap-4">
            {brand?.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-16 w-16 rounded-xl border border-gray-200 object-contain dark:border-gray-800"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-xl font-black text-brand-600 dark:bg-brand-950/30">
                {brand?.name?.[0] ?? 'B'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                {brand?.name ?? 'Loading…'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {meta.total} {meta.total === 1 ? 'product' : 'products'}
                {minPrice > 0 ? ` · Prices from ${formatMoney(minPrice)}` : ''}
              </p>
            </div>
          </div>
          {brand?.description && (
            <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {brand.description}
            </p>
          )}
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        {/* Toolbar */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {meta.total}
            </span>{' '}
            products
          </p>
          <div className="relative">
            <select
              value={sort}
              onChange={e => onSortChange(e.target.value)}
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {SORTS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              No products from {brand?.name} yet
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
            {page < meta.last_page && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Other brands */}
        {allBrands.filter(b => b.slug !== brand?.slug).length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Other brands
            </h2>
            <div className="flex flex-wrap gap-2">
              {allBrands
                .filter(b => b.slug !== brand?.slug)
                .map(b => (
                  <Link
                    key={b.id}
                    href={`/store/brand/${b.slug}`}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {b.name}
                  </Link>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
